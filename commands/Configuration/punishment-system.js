const Discord = require('discord.js');
const systemSchema = require('../../schemas/system-schema');
const ms = require('ms');

module.exports = {
    name: 'punishment-system',
    description: 'Set up punishments that will be given for users reaching X automod warnings',
    usage: 'punishment-system (warnings) (action) [...additional args]\npunishment-system view\npunishment-system reset',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    aliases: ['punishmentsystem', 'system'],
    async execute(client, message, args) {
        const systemCheck = await systemSchema.findOne({ guildID: message.guild.id });

        let warningsCount = args[0];
        if (!warningsCount || warningsCount === 'view') {
            if (systemCheck.system.length === 0)
                return message.reply('No warning amount instances are set for this server');
            if (systemCheck.system.length === 0)
                return message.reply('No warning amount instances are set for this server');
            const pSystem = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(message.guild))
                .setAuthor(`Punishment system for ${message.guild.name}`, client.user.displayAvatarURL());
            pSystem.setDescription(
                systemCheck.system
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
            message.reply({ embeds: [pSystem] });
            return;
        } else if (warningsCount === 'reset') {
            if (global.confirmationRequests.some(request => request.ID === message.author.id))
                global.confirmationRequests.pop({ ID: message.author.id });
            global.confirmationRequests.push({
                ID: message.author.id,
                guildID: message.guild.id,
                request: 'resetSystem',
                at: Date.now()
            });
            return message.reply(
                'Are you sure? This will reset the **entire** punishment system. To confirm, run the `confirm` command. To cancel. run the `cancel` command'
            );
        }
        if (warningsCount && !ms(warningsCount))
            return client.util.throwError(message, client.config.errors.bad_input_number);
        warningsCount = Math.floor(warningsCount);
        if (warningsCount && warningsCount < 2)
            return client.util.throwError(message, 'the value must be 2 or greater!');
        if (warningsCount && warningsCount > 20)
            return client.util.throwError(message, 'the value must be less than or equal to 20!');

        let systemWarningCountCheck;

        if (warningsCount) {
            systemWarningCountCheck = await systemSchema.findOne({
                guildID: message.guild.id,
                system: {
                    $elemMatch: {
                        amount: warningsCount
                    }
                }
            });
        }

        const punishment = args[1]?.toLowerCase();
        if (warningsCount && !punishment)
            return message.reply(
                `Please specify what punishment a user should be given for reaching \`${warningsCount}\` warnings`
            );

        const updateSystemSchema = async (type, duration = null) => {
            if (type === 'disable') {
                await systemSchema.updateOne(
                    {
                        guildID: message.guild.id
                    },
                    {
                        $pull: {
                            system: {
                                amount: warningsCount
                            }
                        }
                    }
                );

                return;
            }

            if (duration) {
                await systemSchema.updateOne(
                    {
                        guildID: message.guild.id
                    },
                    {
                        $push: {
                            system: {
                                amount: warningsCount,
                                punishment: type,
                                duration: Math.floor(duration)
                            }
                        }
                    }
                );
            } else {
                await systemSchema.updateOne(
                    {
                        guildID: message.guild.id
                    },
                    {
                        $push: {
                            system: {
                                amount: warningsCount,
                                punishment: type
                            }
                        }
                    }
                );
            }
        };

        const duration = args[2] ? ms(args[2]) : null;
        if (!duration && args[1] && (args[1] === 'tempmute' || args[1] === 'tempban')) {
            if (!args[2]) return client.util.throwError(message, client.config.errors.missing_argument_duration);
            else return client.util.throwError(message, client.config.errors.bad_duration);
        } else if (duration && duration > 315576000000)
            return client.util.throwError(message, client.config.errors.time_too_long);

        switch (punishment) {
            case 'disable':
                if (!systemWarningCountCheck || systemWarningCountCheck.system.length === 0)
                    return message.reply(
                        'There is no punishment given at this warning count. You can view the current system by running `punishment-system view`'
                    );
                updateSystemSchema('disable');
                message.reply(`Successfully removed the punishment given at \`${warningsCount}\` warnings`);
                break;
            case 'kick':
                if (systemWarningCountCheck?.system?.length > 0)
                    return message.reply(
                        `A punishment is already given out at this warning count. Please disable this first then try again`
                    );
                updateSystemSchema('kick');
                message.reply(`Success! Users will now get kicked for reaching ${warningsCount} warnings`);
                break;
            case 'mute':
                if (systemWarningCountCheck?.system?.length > 0)
                    return message.reply(
                        `A punishment is already given out at this warning count. Please disable this first then try again`
                    );
                updateSystemSchema('mute');
                message.reply(`Success! Users will now get muted for reaching ${warningsCount} warnings`);
                break;
            case 'ban':
                if (systemWarningCountCheck?.system?.length > 0)
                    return message.reply(
                        `A punishment is already given out at this warning count. Please disable this first then try again`
                    );
                updateSystemSchema('ban');
                message.reply(`Success! Users will now get banned for reaching ${warningsCount} warnings`);
                break;
            case 'tempmute':
                if (systemWarningCountCheck?.system?.length > 0)
                    return message.reply(
                        `A punishment is already given out at this warning count. Please disable this first then try again`
                    );
                updateSystemSchema('tempmute', duration);
                message.reply(
                    `Success! Users will now get muted for \`${client.util.duration(
                        duration
                    )}\` for reaching ${warningsCount} warnings`
                );
                break;
            case 'tempban':
                if (systemWarningCountCheck?.system?.length > 0)
                    return message.reply(
                        `A punishment is already given out at this warning count. Please disable this first then try again`
                    );
                updateSystemSchema('tempban', duration);
                message.reply(
                    `Success! Users will now get banned for \`${client.util.duration(
                        duration
                    )}\` for reaching ${warningsCount} warnings`
                );
                break;
            default:
                return message.reply(
                    'Invalid punishment! The punishments are: `kick, mute, ban, tempmute, tempban` or `disable` to remove the punishment given at the specified warning count'
                );
        }
    }
};
