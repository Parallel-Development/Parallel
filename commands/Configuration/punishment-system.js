const Discord = require('discord.js');
const systemSchema = require('../../schemas/system-schema');
const ms = require('ms');

module.exports = {
    name: 'punishment-system',
    description: 'Set up punishments that will be given for users reaching X automod warnings',
    usage: 'punishment-system (warnings) (action) [...additional args]\npunishment-system view\npunishment-system reset',
    moderationCommand: true,
    permissions: 'MANAGE_GUILD',
    aliases: ['punishmentsystem', 'system'],
    async execute(client, message, args) {

        const systemCheck = await systemSchema.findOne({
            guildID: message.guild.id
        })

        if (!systemCheck) {
            await new systemSchema({
                guildID: message.guild.id,
                guildname: message.guild.name,
                system: []
            }).save()
        }

        let warningsCount = args[0];
        if (warningsCount === 'view') {
            if (systemCheck.system.length === 0) return message.channel.send('No warning amount instances are set for this server')
            const pSystem = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setAuthor(`Punishment system for ${message.guild.name}`, client.user.displayAvatarURL())
            const descriptionArr = [];
            for(var i = 0; i !== systemCheck.system.length; ++i) {
                const instance = systemCheck.system[i];
                console.log(instance);
                descriptionArr.push(`**${instance.amount} warnings**: \`${instance.duration ? instance.punishment + ' for ' + client.util.convertMillisecondsToDuration(instance.duration) : instance.punishment}\``)
            }
            const description = descriptionArr.sort().join('\n\n');
            pSystem.setDescription(description)
            return message.channel.send(pSystem);
        } else if (warningsCount === 'reset') {
            await systemSchema.updateOne({
                guildID: message.guild.id
            },
                {
                    system: []
                })
            return message.channel.send('All warning instances have been removed!')
        }
        if (warningsCount && !ms(warningsCount)) return message.channel.send(client.config.errorMessages.bad_input_number);
        warningsCount = Math.round(warningsCount)
        if (warningsCount && warningsCount < 2) return message.channel.send('The value must be 2 or greater!');
        if (warningsCount && warningsCount > 20) return message.channel.send('The value must be less than or equal to 20!');

        let systemWarningCountCheck;

        if (warningsCount) {
            systemWarningCountCheck = await systemSchema.findOne({
                guildID: message.guild.id,
                system: {
                    $elemMatch: {
                        amount: warningsCount
                    }
                }
            })
        }

        const punishment = args[1];
        if (warningsCount && !punishment) return message.channel.send(`Please specify what punishment a user should be given for reaching \`${warningsCount}\` warnings`)

        const updateSystemSchema = async (type, duration = null) => {

            if(type === 'disable') {
                await systemSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $pull: {
                            system: {
                                amount: warningsCount
                            }
                        }
                    })

                return;
            }

            if (duration) {
                await systemSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $push: {
                            system: {
                                amount: warningsCount,
                                punishment: type,
                                duration: Math.round(duration)
                            }
                        }
                    })
            } else {
                await systemSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $push: {
                            system: {
                                amount: warningsCount,
                                punishment: type
                            }
                        }
                    })
            }
        }

        const duration = args[2] ? ms(args[2]) : null
        if (!duration && (args[1] && (args[1] === 'tempmute' || args[1] === 'temban'))) {
            if (!args[2]) return message.channel.send(client.config.errorMessages.missing_argument_duration)
            else return message.channel.send(client.config.errorMessages.bad_duration)
        } else if (duration && duration > 315576000000) return message.channel.send(client.config.errorMessages.time_too_long);

        switch (punishment) {

            case 'disable':
                if (!systemWarningCountCheck || systemWarningCountCheck.system.length === 0) return message.channel.send('There is no punishment given at this warning count. You can view the current system by running `punishment-system view`');
                updateSystemSchema('disable');
                message.channel.send(`Successfully removed the punishment given at \`${warningsCount}\` warnings`)
                break;
            case 'kick':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`)
                updateSystemSchema('kick')
                message.channel.send(`Success! Users will now get kicked for reaching ${warningsCount} warnings`)
                break;
            case 'mute':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`)
                updateSystemSchema('mute')
                message.channel.send(`Success! Users will now get muted for reaching ${warningsCount} warnings`)
                break;
            case 'ban':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`)
                updateSystemSchema('ban')
                message.channel.send(`Success! Users will now get banned for reaching ${warningsCount} warnings`)
                break;
            case 'tempmute':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`);
                updateSystemSchema('tempmute', duration)
                message.channel.send(`Success! Users will now get muted for \`${client.util.convertMillisecondsToDuration(duration)}\` for reaching ${warningsCount} warnings`)
                break;
            case 'tempban':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`);
                updateSystemSchema('tempban', duration)
                message.channel.send(`Success! Users will now get banned for \`${client.util.convertMillisecondsToDuration_duration}\` for reaching ${warningsCount} warnings`)
                break;
            default:
                if (warningsCount) return message.channel.send('Invalid punishment! The punishments are: `kick, mute, ban, tempmute, tempban` or `disable` to remove the punishment given at the specified warning count')
                else {
                    if (systemCheck.system.length === 0) return message.channel.send('No warning amount instances are set for this server')
                    const pSystem_ = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setAuthor(`Punishment system for ${message.guild.name}`, client.user.displayAvatarURL())
                    const descriptionArr_ = [];
                    for (var i = 0; i !== systemCheck.system.length; ++i) {
                        const instance = systemCheck.system[i];
                        descriptionArr_.push(`**${instance.amount} warnings**: \`${instance.duration ? instance.punishment + ' for ' + client.util.convertMillisecondsToDuration(instance.duration) : instance.punishment}\``)
                    }
                    const description_ = descriptionArr_.sort().join('\n\n');
                    pSystem_.setDescription(description_)
                    message.channel.send(pSystem_)
                    return;
                }
        }
    }
}
