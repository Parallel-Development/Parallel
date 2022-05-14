const Discord = require('discord.js');
const systemSchema = require('../../schemas/system-schema');
const ms = require('ms');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'punishment-system',
    description: 'Set up punishments that will be given for users reaching X automod warnings',
    data: new SlashCommandBuilder()
        .setName('punishment-system')
        .setDescription(
            'Punishments to be automatically distributed to users reaching a specific amount of automod warnings'
        )
        .addSubcommand(command =>
            command
                .setName('set')
                .setDescription('Set a specific warning instance to a punishment')
                .addIntegerOption(option =>
                    option
                        .setName('warning_count')
                        .setDescription('The amount of automod warnings a user should reach to get punished')
                        .setRequired(true)
                )
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
                .addStringOption(option => option.setName('duration').setDescription('The duration of the punishment'))
        )
        .addSubcommand(command =>
            command
                .setName('disable')
                .setDescription('Remove a punishment system warning count instance')
                .addIntegerOption(option =>
                    option.setName('warning_count').setDescription('The warning count').setRequired(true)
                )
        )
        .addSubcommand(command =>
            command.setName('reset').setDescription('Remove all warning count instances from the punishment system')
        )
        .addSubcommand(command => command.setName('view').setDescription('View the current set punishment-system')),
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    async execute(client, interaction, args) {
        const subArgs = interaction.options.data.reduce((map, arg) => ((map[arg.name] = arg), map), {});
        const systemCheck = await systemSchema.findOne({ guildID: interaction.guild.id });

        if (subArgs['set']) {
            const setArgs = subArgs['set'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
            const warningCount = setArgs['warning_count'];
            if (warningCount > 20 || warningCount < 2)
                return client.util.throwError(interaction, 'the warning count must be between `2` and `20`');

            const punishment = setArgs['type'];
            const duration = setArgs['duration'] ? ms(setArgs['duration']) : null;

            if (punishment.startsWith('temp') && !setArgs['duration'])
                return client.util.throwError(interaction, client.config.errors.missing_argument_duration);
            if (punishment.startsWith('temp') && !duration)
                return client.util.throwError(interaction, client.config.errors.bad_duration);
            if (duration && !(punishment.startsWith('temp') || punishment === 'warn'))
                return client.util.throwError(
                    interaction,
                    `Warning at argument \`duration\`: a duration was specified but not expected. A duration can only be input for types \`warn\`, \`tempmute\` and \`tempban\``
                );
            if (duration && duration > 315576000000)
                return client.util.throwError(interaction, client.config.errors.time_too_long);

            const updateSystemSchema = async (type, duration = null) => {
                if (duration) {
                    await systemSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            $push: {
                                system: {
                                    amount: warningCount,
                                    punishment: type,
                                    duration: Math.round(duration)
                                }
                            }
                        }
                    );
                } else {
                    await systemSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            $push: {
                                system: {
                                    amount: warningCount,
                                    punishment: type
                                }
                            }
                        }
                    );
                }
            };

            const systemWarningCountCheck = await systemSchema.findOne({
                guildID: interaction.guild.id,
                system: {
                    $elemMatch: {
                        amount: warningCount
                    }
                }
            });

            switch (punishment) {
                case 'kick':
                    if (systemWarningCountCheck?.system?.length > 0)
                        return client.util.throwError(
                            interaction,
                            `A punishment is already given out at this warning count. Please disable this first then try again`
                        );
                    updateSystemSchema('kick');
                    interaction.reply(`Success! Users will now get kicked for reaching ${warningCount} warnings`);
                    break;
                case 'mute':
                    if (systemWarningCountCheck?.system?.length > 0)
                        return client.util.throwError(
                            interaction,
                            `A punishment is already given out at this warning count. Please disable this first then try again`
                        );
                    updateSystemSchema('mute');
                    interaction.reply(`Success! Users will now get muted for reaching ${warningCount} warnings`);
                    break;
                case 'ban':
                    if (systemWarningCountCheck?.system?.length > 0)
                        return client.util.throwError(
                            interaction,
                            `A punishment is already given out at this warning count. Please disable this first then try again`
                        );
                    updateSystemSchema('ban');
                    interaction.reply(`Success! Users will now get banned for reaching ${warningCount} warnings`);
                    break;
                case 'tempmute':
                    if (systemWarningCountCheck?.system?.length > 0)
                        return client.util.throwError(
                            interaction,
                            `A punishment is already given out at this warning count. Please disable this first then try again`
                        );
                    updateSystemSchema('tempmute', duration);
                    interaction.reply(
                        `Success! Users will now get muted for \`${client.util.duration(
                            duration
                        )}\` for reaching ${warningCount} warnings`
                    );
                    break;
                case 'tempban':
                    if (systemWarningCountCheck?.system?.length > 0)
                        return client.util.throwError(
                            interaction,
                            `A punishment is already given out at this warning count. Please disable this first then try again`
                        );
                    updateSystemSchema('tempban', duration);
                    interaction.reply(
                        `Success! Users will now get banned for \`${client.util.duration(
                            duration
                        )}\` for reaching ${warningCount} warnings`
                    );
                    break;
                default:
                    return client.util.throwError(
                        interaction,
                        'Invalid punishment! The punishments are: `kick, mute, ban, tempmute, tempban` or `disable` to remove the punishment given at the specified warning count'
                    );
            }
        } else if (subArgs['disable']) {
            const disableArgs = subArgs['disable'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
            const warningCount = disableArgs['warning_count'];

            const systemWarningCountCheck = await systemSchema.findOne({
                guildID: interaction.guild.id,
                system: {
                    $elemMatch: {
                        amount: warningCount
                    }
                }
            });

            if (!systemWarningCountCheck || systemWarningCountCheck.system.length === 0)
                return client.util.throwError(
                    interaction,
                    'There is no punishment given at this warning count. You can view the current system by running `punishment-system view`'
                );
            await systemSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    $pull: {
                        system: {
                            amount: warningCount
                        }
                    }
                }
            );
            return interaction.reply(`Successfully removed the punishment given at \`${warningCount}\` warnings`);
        } else if (subArgs['reset']) {
            if (global.confirmationRequests.some(request => request.ID === interaction.user.id))
                global.confirmationRequests.pop({ ID: interaction.user.id });
            global.confirmationRequests.push({
                ID: interaction.user.id,
                guildID: interaction.guild.id,
                request: 'resetSystem',
                at: Date.now()
            });
            return interaction.reply(
                'Are you sure? This will reset the **entire** punishment system. To confirm, run `/confirm`. To cancel. run `/cancel`'
            );
        } else if (subArgs['view']) {
            if (systemCheck.system.length === 0)
                return interaction.reply('No warning amount instances are set for this server');
            if (systemCheck.system.length === 0)
                return interaction.reply('No warning amount instances are set for this server');
            const pSystem = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(interaction.guild))
                .setAuthor(`Punishment system for ${interaction.guild.name}`, client.user.displayAvatarURL());
            pSystem.setDescription(
                systemCheck.system
                    .sort((first, second) => first.amount - second.amount)
                    .map(
                        instance =>
                            `**${instance.amount}** warnings: \`${
                                instance.duration
                                    ? instance.punishment.replace('temp', '') +
                                      ' for ' +
                                      client.util.duration(instance.duration)
                                    : instance.punishment
                            }\``
                    )
                    .join('\n\n')
            );
            return interaction.reply({ embeds: [pSystem] });
        }
    }
};
