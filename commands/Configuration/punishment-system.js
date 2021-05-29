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
            guildid: message.guild.id
        })

        if(!systemCheck) {
            await new systemSchema ({
                guildid: message.guild.id,
                guildname: message.guild.name,
                system: []
            }).save()
        }
        
        let warningsCount = args[0];
        if(warningsCount == 'view') {
            if(systemCheck.system.length == 0) return message.channel.send('No warning amount instances are set for this server')
            const pSystem = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setAuthor(`Punishment system for ${message.guild.name}`, client.user.displayAvatarURL())
            let descriptionArr = [];
            systemCheck.system.forEach(instance => {
                descriptionArr.push(`**${instance.amount} warnings**: \`${instance.punishment}\``)
            })
            let description = descriptionArr.sort().join('\n\n');
            pSystem.setDescription(description)
            message.channel.send(pSystem)
            return;
        } else if(warningsCount == 'reset') {
            await systemSchema.updateOne({
                guildid: message.guild.id
            },
            {
                system: []
            })
            message.channel.send('All warning instances have been removed!')
            return;
        }
        if(!warningsCount) return message.channel.send('Please specify how many warnings a user must reach');
        if(!ms(warningsCount)) return message.channel.send('Please specify a valid warning count');
        warningsCount = Math.round(warningsCount)
        if(warningsCount < 2) return message.channel.send('The value must be 2 or greater!');
        if(warningsCount > 20) return message.channel.send('The value must be less than or equal to 20!');

        const systemWarningCountCheck = await systemSchema.findOne({
            guildid: message.guild.id,
            system: {
                $elemMatch: {
                    amount: warningsCount
                }
            }
        })

        const punishment = args[1];
        if(!punishment) return message.channel.send(`Please specify what punishment a user should be given for reaching \`${warningsCount}\` warnings`)

        switch(punishment) {
            case 'disable':
                if (!systemWarningCountCheck || systemWarningCountCheck.system.length == 0) return message.channel.send('There is no punishment given at this warning count. You can view the current system by running `punishment-system view`');
                await systemSchema.updateOne({
                    guildid: message.guild.id
                },
                {
                    $pull: {
                        system: {
                            amount: warningsCount
                        }
                    }
                })
                message.channel.send(`Successfully removed the punishment given at \`${warningsCount}\` warnings`)
                break;
            case 'kick':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`)
                await systemSchema.updateOne({
                    guildid: message.guild.id
                },
                {
                    $push: {
                        system: {
                            amount: warningsCount,
                            punishment: 'kick'
                        }
                    }
                })
                message.channel.send(`Success! Users will now get kicked for reaching ${warningsCount} warnings`)
                break;
            case 'mute':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`)
                await systemSchema.updateOne({
                    guildid: message.guild.id
                },
                {
                    $push: {
                         system: {
                            amount: warningsCount,
                            punishment: 'mute'
                        }
                    }
                })
                message.channel.send(`Success! Users will now get muted for reaching ${warningsCount} warnings`)
                break;
            case 'ban':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`)
                await systemSchema.updateOne({
                    guildid: message.guild.id
                },
                {
                    $push: {
                        system: {
                            amount: warningsCount,
                            punishment: 'ban'
                        }
                    }
                })
                message.channel.send(`Success! Users will now get banned for reaching ${warningsCount} warnings`)
                break;
            case 'tempmute':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`);
                if(!args[2]) return message.channel.send('Please specify a duration for which the user will be muted for')
                var duration = ms(args[2])
                if (duration == undefined) return message.channel.send('Invalid duration specified!')
                await systemSchema.updateOne({
                    guildid: message.guild.id
                },
                {
                    $push: {
                        system: {
                            amount: warningsCount,
                            punishment: 'tempmute',
                            duration: Math.round(duration)
                        }
                    }
                })
                message.channel.send(`Success! Users will now get muted for ${args[2]} for reaching ${warningsCount} warnings`)
                break;
            case 'tempban':
                if (systemWarningCountCheck && systemWarningCountCheck.system.length > 0) return message.channel.send(`A punishment is already given out at this warning count. Please disable this first then try again`);
                if (!args[2]) return message.channel.send('Please specify a duration for which the user will be banned for')
                var duration = ms(args[2])
                if (duration == undefined) return message.channel.send('Invalid duration specified!')
                await systemSchema.updateOne({
                    guildid: message.guild.id
                },
                {
                    $push: {
                        system: {
                            amount: warningsCount,
                            punishment: 'tempban',
                            duration: Math.round(duration)
                        }
                    }
                })
                message.channel.send(`Success! Users will now get muted for ${args[2]} for reaching ${warningsCount} warnings`)
                break;
            default:
                return message.channel.send('Invalid punishment! The punishments are: `kick, mute, ban, tempmute, tempban` or `disable` to remove the punishment given at the specified warning count')
        }
    }
}