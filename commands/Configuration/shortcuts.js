const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');

module.exports = {
    name: 'shortcuts',
    description: 'Add custom punishment shortcut commands in which have can have a default reason and duration',
    usage: 'shortcuts create [shortcut name] <duration> (reason)\nshortcuts remove [shortcut name]\nshortcuts removeall\nshortcuts view',
    aliases: ['shortcut', 'short'],
    async execute(client, message, args) {

        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_option);
        const option = args[0];

        const guildSettings = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const { shortcutCommands, modRoles, modRolePermissions } = guildSettings;

        if (
            !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            (!message.member.roles.cache.some(role => modRoles.includes(role.id)) ||
                new Discord.Permissions(modRolePermissions).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
        )
            return client.util.throwError(message, 'no permission to manage server shortcuts');

        if (
            message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD) &&
            option !== 'view'
        )
            return client.util.throwError(message, 'you may only view the server shortcuts');

        if (!(option === 'create' || option === 'remove' || option === 'removeall' || option === 'view'))
            return client.util.throwError(message, client.config.errors.invalid_option);

        if (option === 'view') {
            if (!shortcutCommands?.length) return message.reply('No shortcut commands are setup for this server!');
            const viewEmbed = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(message.guild))
                .setAuthor(`Shortcut commands for ${message.guild.name}`, client.user.displayAvatarURL());
            const scommands = [];
            for (const command of shortcutCommands) scommands.push(`\`${command.name}\``);
            viewEmbed.setDescription(
                `You can get more information about a shortcut command by running \`>help (shortcut command name)\`\n\n${scommands.join(
                    ', '
                )}`
            );

            return message.reply({ embeds: [viewEmbed] });
        }

        const shortcutName = args[1]?.toLowerCase();
        const type = args[2]?.toLowerCase();
        if (!shortcutName && option !== 'removeall')
            return message.reply(
                'Error at argument `name`: a shortcut name is required!\n\n`>shortcuts create` + add a shortcut name here'
            );

        client.cache.settings.delete(message.guild.id);

        if (option === 'create') {
            if (client.commands.has(shortcutName) || client.aliases.has(shortcutName))
                return message.reply(
                    `Error at argument \`name\`: illegal shortcut name\n\n\`>shortcuts create\` \`${shortcutName}\` <- change the shortcut name to a non-existant built in command \`...\``
                );
            if (shortcutCommands.some(command => command.name === shortcutName))
                return message.reply(
                    `Error at argument \`name\`: a shortcut with this name already exists!\n\n\`>shortcuts create\` \`${shortcutName}\` <- change the name to a non-existant shortcut name in your server \`...\``
                );
            if (shortcutCommands.length > 50)
                return message.reply(
                    'Refused to create command: you have exceeded the allowed amount of shortcut commands. You must delete one in order to add another\n\nRemove a shortcut: `>shortcuts remove [any shortcut name]`'
                );
            if (shortcutName.length > 20)
                return message.reply(
                    `Refused to create command: the shortcut name must be 20 characters or less\n\n\`>shortcuts create\` \`${shortcutName}\` <- remove **${
                        shortcutName.length - 20
                    }** characters from this argument \`...\``
                );

            const __duration = args[3];
            const duration = parseInt(__duration) && __duration !== '' ? ms(__duration) : null;
            const reason = duration
                ? args.slice(4).join(' ') || 'Unspecified'
                : args.slice(3).join(' ') || 'Unspecified';

            const allowedTypes = ['warn', 'kick', 'mute', 'ban', 'tempmute', 'tempban'];

            if (!type)
                return message.reply(
                    `Error at argument \`type\`: a punishment type is required!\n\n\`>shortcuts create ${shortcutName}\` + add a punishment type here`
                );
            if (!allowedTypes.includes(type))
                return message.reply(
                    `Error at first argument \`type\`: an invalid type was provided! The allowed types are ${allowedTypes
                        .map(type => `\`${type}\``)
                        .join(
                            ', '
                        )}\n\n\`>shortcuts create ${shortcutName}\` \`${type}\` <- type was not one of the allowed types \`...\``
                );
            if (type.startsWith('temp') && !__duration)
                return message.reply(
                    `Error at argument \`duration\`: no duration was specified\n\n\`>shortcuts create ${shortcutName}\` + add a duration here`
                );
            if (type.startsWith('temp') && !ms(__duration))
                return message.reply(
                    `Error at argument \`duration\`: an invalid duration was specified\n\n1st solution: \`>shortcuts create ${shortcutName} ${type}\` + add a duration here \`...\`\n2nd solution: \`>shortcuts create ${shortcutName} ${type}\` \`${__duration}\` <- replace this with a valid duration \`...\`\n(two possible solutions)`
                );
            if (duration && !(type.startsWith('temp') || type === 'warn'))
                return message.reply(
                    `Warning at argument \`duration\`: a duration was specified but not expected. A duration can only be input for types \`warn\`, \`tempmute\` and \`tempban\`\n\n\`>shortcuts create ${shortcutName} ${type}\` \`${__duration}\` <- remove this argument \`...\``
                );
            if (duration && duration > 315576000000) {
                if (type === 'warn')
                    return message.reply(
                        `Error at argument \`duration\`: the duration must be equivalent to a duration of 10 year or less\n\n\`>shortcuts create ${shortcutName} ${type}\` \`${__duration}\` <- remove this argument, or change it to **10y** \`...\``
                    );
                else
                    return message.reply(
                        `Error at argument \`duration\`: the duration must be equivalent to a duration of 10 year or less\n\n1st solution: \`>shortcuts create ${shortcutName}\` \`${type}\` <- change this to **${type.replace(
                            'temp',
                            ''
                        )}** \`${__duration}\` <- remove this argument \`...\`\n2nd solution: \`>shortcuts create ${shortcutName} ${type}\` \`${__duration}\` <- change this to **10y** \`...\`\n(two possible solutions)`
                    );
            }

            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
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

            return message.reply(`Successfully created shortcut \`${shortcutName}\``);
        } else if (option === 'remove') {
            if (!shortcutCommands.some(command => command.name === shortcutName))
                return message.reply('Could not find a shortcut with this name');

            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    $pull: {
                        shortcutCommands: {
                            name: shortcutName
                        }
                    }
                }
            );

            return message.reply(`Successfully removed shortcut \`${shortcutName}\``);
        } else if (option === 'removeall') {
            if (!shortcutCommands.length) return message.reply('There are no shortcuts');

            if (global.confirmationRequests.some(request => request.ID === message.author.id))
                global.confirmationRequests.pop({ ID: message.author.id });
            global.confirmationRequests.push({
                ID: message.author.id,
                guildID: message.guild.id,
                request: 'deleteAllShortcuts',
                at: Date.now()
            });
            return message.reply(
                'Are you sure? This will delete all shortcut commands. To confirm, run the `confirm` command. To cancel, run the `cancel` command'
            );
        }
    }
};
