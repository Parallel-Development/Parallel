const Discord = require('discord.js')
const { i } = require('mathjs')
const automodSchema = require('../../schemas/automod-schema')
const settingsSchema = require('../../schemas/settings-schema')

module.exports = {
    name: 'allowcmds',
    description: 'Enable or disable commands in channels',
    permissions: 'MANAGE_GUILD',
    usage: 'command [switch: enable, disable, viewdisabled] <channel>',
    aliases: ['allowcommands'],
    async execute(client, message, args) {

        switch(args[0]) {
            case 'enable':
                const enableChannel = message.mentions.channels.first()
                if (!enableChannel) return message.channel.send('Please specify the channel you wish to manage')
                if (enableChannel.type !== 'text') return message.channel.send('The channel must only be a text channel!')

                const alreadyEnabled = await settingsSchema.findOne({
                    guildid: message.guild.id,
                    locked: enableChannel.id
                })
                if (!alreadyEnabled || alreadyEnabled.length == 0) {
                    return message.channel.send('Commands are already enabled in this channel! `allowcmds viewdisabled` to view disabled command channels')
                }

                await settingsSchema.updateOne({
                    guildid: message.guild.id,
                },
                    {
                        $pull: {
                            locked: enableChannel.id
                        }
                    })
                message.channel.send(`Commands in ${enableChannel} have been enabled`)
                break;
            case 'disable':
                const disableChannel = message.mentions.channels.first()
                if (!disableChannel) return message.channel.send('Please specify the channel you wish to manage')
                if (disableChannel.type !== 'text') return message.channel.send('The channel must only be a text channel!')

                const alreadyDisabled = await settingsSchema.findOne({
                    guildid: message.guild.id,
                    locked: disableChannel.id
                })
                if (alreadyDisabled && alreadyDisabled.length !== 0) {
                    return message.channel.send('Commands are already disabled in this channel! `allowcmds viewdisabled` to view disabled command channels')
                }

                await settingsSchema.updateOne({
                    guildid: message.guild.id,
                },
                    {
                        $push: {
                            locked: disableChannel.id
                        }
                    })
                message.channel.send(`Commands in ${disableChannel} have been disabled`)
                break;
            case 'viewdisabled':
                const grabLocked = await settingsSchema.findOne({
                    guildid: message.guild.id
                })
                const { locked } = grabLocked
                if (locked == null || locked.length == 0) return message.channel.send('No channels currrently prevent commands. Want to add some? `allowcmds disable (channel)`')
                const disabledCommandChannels = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setAuthor(`Disabled command channels for ${message.guild.name}`, client.user.displayAvatarURL())

                disabledChannels = new Array()
                locked.forEach(async (channel) => {
                    if (!message.guild.channels.cache.get(channel) || message.guild.channels.cache.get(channel).type !== 'text') {
                        await settingsSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                $pull: {
                                    locked: channel
                                }
                            })
                    } else {
                        disabledChannels.push(message.guild.channels.cache.get(channel))
                    }
                })
                disabledCommandChannels.setDescription(disabledChannels.join(', '))
                message.channel.send(disabledCommandChannels)
                break;
            default:
                return message.channel.send('Invalid option! Options: enable, disable, viewdisabled')
        }
    }
}