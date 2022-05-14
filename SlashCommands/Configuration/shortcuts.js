const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'shortcuts',
    description: 'Add custom punishment shortcut commands in which have can have a default reason and duration',
    data: new SlashCommandBuilder()
        .setName('shortcuts')
        .setDescription(
            'Manage custom punishment shortcut commands in which have can have a default reason and duration'
        )
        .addSubcommand(command =>
            command
                .setName('create')
                .setDescription('Create a shortcut command')
                .addStringOption(option => option.setName('name').setDescription('The shortcut name').setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('The punishment type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Warn', value: 'warn' },
                            { name: 'Kick', value: 'kick' },
                            { name: 'Mute', value: 'mute' },
                            { name: 'Ban', value: 'ban' },
                            { name: 'Temp-mute', value: 'tempmute' },
                            { name: 'Temp-ban', value: 'tempban' }
                        )
                )
                .addStringOption(option => option.setName('duration').setDescription('The duration for the punishment'))
                .addStringOption(option => option.setName('reason').setDescription('The reason for the punishment'))
        )
        .addSubcommand(command =>
            command
                .setName('delete')
                .setDescription('Remove a shorcut command')
                .addStringOption(option =>
                    option.setName('name').setDescription('The shortcut to remove').setRequired(true)
                )
        )
        .addSubcommand(command => command.setName('delete-all').setDescription('Delete all shortcut commands'))
        .addSubcommand(command => command.setName('view').setDescription('View all the existing shortcut commands')),
    async execute(client, interaction, args) {
        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { shortcutCommands, modRoles, modRolePermissions } = guildSettings;

        const subArgs = interaction.options.data.reduce((map, arg) => ((map[arg.name] = arg), map), {});

        if (
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            (!interaction.member.roles.cache.some(role => modRoles.includes(role.id)) ||
                new Discord.Permissions(modRolePermissions).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
        )
            return client.util.throwError(interaction, 'no permission to manage server shortcuts');

        if (
            interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD) &&
            !subArgs['view']
        )
            return client.util.throwError(interaction, 'you may only view the server shortcuts');

        client.cache.settings.delete(interaction.guild.id);

        if (subArgs['create']) {
            const createArgs = subArgs['create'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
            const shortcutName = createArgs['name'];
            if (shortcutName.split(' ').length > 1)
                return client.util.throwError(interaction, 'shortcut name must not contain spaces');
            const type = createArgs['type'];

            if (client.commands.has(shortcutName) || client.aliases.has(shortcutName))
                return client.util.throwError(interaction, `Error at argument \`name\`: illegal shortcut name`);
            if (shortcutCommands.some(command => command.name === shortcutName))
                return client.util.throwError(
                    interaction,
                    `Error at argument \`name\`: a shortcut with this name already exists!`
                );
            if (shortcutCommands.length > 50)
                return client.util.throwError(
                    interaction,
                    'Refused to create command: you have exceeded the allowed amount of shortcut commands. You must delete one in order to add another'
                );
            if (shortcutName.length > 20)
                return client.util.throwError(
                    interaction,
                    `Refused to create command: the shortcut name must be 20 characters or less`
                );

            const duration = createArgs['duration'] ? ms(createArgs['duration']) : null;
            const reason = createArgs['reason'] || 'Unspecified';

            if (type.startsWith('temp') && !createArgs['duration'])
                return client.util.throwError(interaction, `Error at argument \`duration\`: no duration was specified`);
            if (type.startsWith('temp') && !duration)
                return client.util.throwError(
                    interaction,
                    `Error at argument \`duration\`: an invalid duration was specified`
                );
            if (duration && !(type.startsWith('temp') || type === 'warn'))
                return client.util.throwError(
                    interaction,
                    `Warning at argument \`duration\`: a duration was specified but not expected. A duration can only be input for types \`warn\`, \`tempmute\` and \`tempban\``
                );
            if (duration && duration > 315576000000) {
                if (type === 'warn')
                    return client.util.throwError(
                        interaction,
                        `Error at argument \`duration\`: the duration must be equivalent to a duration of 10 years or less`
                    );
                else
                    return client.util.throwError(
                        interaction,
                        `Error at argument \`duration\`: the duration must be equivalent to a duration of 10 years or less`
                    );
            }

            await settingsSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    $push: {
                        shortcutCommands: {
                            name: shortcutName,
                            type: type,
                            reason: reason,
                            duration: type.startsWith('temp') || type === 'warn' ? duration : 'Permanent'
                        }
                    }
                }
            );

            return interaction.reply(`Successfully created shortcut \`${shortcutName}\``);
        } else if (subArgs['delete']) {
            const deleteArgs = subArgs['delete'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});

            const shortcutName = deleteArgs['name'];

            if (!shortcutCommands.some(command => command.name === shortcutName))
                return client.util.throwError(interaction, 'could not find a shortcut with this name');

            await settingsSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    $pull: {
                        shortcutCommands: {
                            name: shortcutName
                        }
                    }
                }
            );

            return interaction.reply(`Successfully removed shortcut \`${shortcutName}\``);
        } else if (subArgs['delete-all']) {
            if (!shortcutCommands.length) return client.util.throwError(interaction, 'this server has no shortcuts');

            if (global.confirmationRequests.some(request => request.ID === interaction.user.id))
                global.confirmationRequests.pop({ ID: interaction.user.id });
            global.confirmationRequests.push({
                ID: interaction.user.id,
                guildID: interaction.guild.id,
                request: 'deleteAllShortcuts',
                at: Date.now()
            });
            return interaction.reply(
                'Are you sure? This will delete all shortcut commands. To confirm, run `/confirm`. To cancel, run `/cancel`'
            );
        } else if (subArgs['view']) {
            if (!shortcutCommands?.length) return interaction.reply('No shortcut commands are setup for this server!');

            const viewEmbed = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(interaction.guild))
                .setAuthor(`Shortcut commands for ${interaction.guild.name}`, client.user.displayAvatarURL());
            viewEmbed.setDescription(
                `You can get more information about a shortcut command by running \`/help (shortcut command name)\`\n\n${shortcutCommands
                    .map(command => `\`${command.name}\``)
                    .join(', ')}`
            );

            return interaction.reply({ embeds: [viewEmbed] });
        }
    }
};
