const Discord = require('discord.js')
const settingsSchema = require('../../schemas/settings-schema')

module.exports = {
    name: 'allowcmds',
    description: 'Enable or disable commands in channels | Moderation commands will still be allowed in these channels',
    permissions: 'MANAGE_GUILD',
    moderationCommand: true,
    usage: 'command [switch: enable, enablecategory, disable, disablecategory, viewdisabled] <channel: text, category (name)>',
    aliases: ['allowcommands'],
    async execute(client, message, args) {

        const grabLocked = await settingsSchema.findOne({
            guildid: message.guild.id
        })
        const { locked } = grabLocked

        switch(args[0]) {
            case 'enable':
                const enableChannel = message.mentions.channels.first()
                if (!enableChannel) return message.channel.send('Please specify the channel you wish to manage')
                if (enableChannel.type !== 'text') return message.channel.send('The channel must only be a text channel!')

                var prevent = false
                locked.forEach(async (channel) => {
                    if (message.guild.channels.cache.get(channel).type == 'category') {
                        if(enableChannel.parent) {
                            if (message.guild.channels.cache.get(channel).id == enableChannel.parent.id) prevent = true
                        }
                    }
                })

                if (prevent) return message.channel.send('This channel\'s category is currently disabled, therefore you cannot enable this channel')

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
            case 'enablecategory':
                const enableCategory = message.guild.channels.cache.find(c => c.name == args.slice(1).join(' '))
                if(!enableCategory) return message.channel.send('Please specify the category name you want to enable commands in')
                if (enableCategory.type !== 'category') return message.channel.send('Please specify a category name only')

                const alreadyEnabledCategory = await settingsSchema.findOne({
                    guildid: message.guild.id,
                    locked: enableCategory.id
                })
                if (!alreadyEnabledCategory || alreadyEnabledCategory.length == 0) {
                    return message.channel.send('Commands are already enabled in this category! `allowcmds viewdisabled` to view disabled command channels')
                }

                await settingsSchema.updateOne({
                    guildid: message.guild.id,
                },
                    {
                        $pull: {
                            locked: enableCategory.id
                        }
                    })

                locked.forEach(async(channel) => {
                    if (message.guild.channels.cache.get(channel).parent.id == disableCategory.id) {
                        await settingsSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                $pull: {
                                    locked: channel
                                }
                            })
                    }
                })

                message.channel.send(`Commands in the category \`${enableCategory.name}\` have been enabled`)
                break;

            case 'disable':
                const disableChannel = message.mentions.channels.first()
                if (!disableChannel) return message.channel.send('Please specify the channel you wish to manage')
                if (disableChannel.type !== 'text') return message.channel.send('The channel must only be a text channel!')

                var prevent = false
                locked.forEach(async (channel) => {
                    if (message.guild.channels.cache.get(channel).type == 'category') {
                        if(disableChannel.parent) {
                            if (message.guild.channels.cache.get(channel).id == disableChannel.parent.id) prevent = true
                        }
                    }
                })
                if (prevent) return message.channel.send('This channel\'s category is currently disabled, therefore you cannot disable this channel')

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
            case 'disablecategory':
                const disableCategory = message.guild.channels.cache.find(c => c.name == args.slice(1).join(' '))
                if (!disableCategory) return message.channel.send('Please specify the category name you want to disable commands in')
                if (disableCategory.type !== 'category') return message.channel.send('Please specify a category name only')

                const alreadyDisabledCategory = await settingsSchema.findOne({
                    guildid: message.guild.id,
                    locked: disableCategory.id
                })
                if (alreadyDisabledCategory && alreadyDisabledCategory.length !== 0) {
                    return message.channel.send('Commands are already disabled in this category! `allowcmds viewdisabled` to view disabled command channels')
                }

                await settingsSchema.updateOne({
                    guildid: message.guild.id,
                },
                    {
                        $push: {
                            locked: disableCategory.id
                        }
                    })

                locked.forEach(async(channel) => {
                    if(message.guild.channels.cache.get(channel).parent.id == disableCategory.id) {
                        await settingsSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            $pull: {
                                locked: channel
                            }
                        })
                    }
                })

                message.channel.send(`Commands in the category \`${disableCategory.name}\` have been disabled`)
                break;
            case 'enableall':
                await settingsSchema.updateOne({
                    guildid: message.guild.id,
                },
                    {
                        locked: []
                    })
                message.channel.send(`All channels now allow commands`)
                break;
            case 'viewdisabled':
                if (locked == null || locked.length == 0) return message.channel.send('No channels currrently prevent commands. Want to add some? `allowcmds disable (channel)`')
                const disabledCommandChannels = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setAuthor(`Disabled command channels for ${message.guild.name}`, client.user.displayAvatarURL())

                disabledChannels = new Array()
                disabledCategories = new Array()
                locked.forEach(async (channel) => {
                    if (!message.guild.channels.cache.get(channel) || message.guild.channels.cache.get(channel).type == 'voice') {
                        await settingsSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                $pull: {
                                    locked: channel
                                }
                            })
                    } else {
                        if(message.guild.channels.cache.get(channel).type == 'category') {
                            disabledCategories.push(message.guild.channels.cache.get(channel).name)
                        } else {
                            disabledChannels.push(message.guild.channels.cache.get(channel))
                        }
                    }
                })
                if(disabledCategories.length > 0) disabledCommandChannels.addField('Categories', disabledCategories.join(', '))
                if(disabledChannels.length > 0) disabledCommandChannels.addField('Channels', disabledChannels.join(', '))
                message.channel.send(disabledCommandChannels)
                break;
            default:
                return message.channel.send('Invalid option! Options: enable, enablecateory, disable, disablecategory, viewdisabled')
        }
    }
}