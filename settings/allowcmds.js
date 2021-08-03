const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema')

exports.run = async (client, message, args) => {
    const grabLocked = await settingsSchema.findOne({
        guildID: message.guild.id
    })
    const { locked } = grabLocked

    switch (args[1]) {
        case 'enable':
            if(!args[0]) return message.reply(client.config.errorMessages.missing_argument_channel);
            const enableChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2])
            if (!enableChannel) return message.reply(client.config.errorMessages.invalid_channel)
            if (enableChannel.type !== 'text') return message.reply(client.config.errorMessages.not_channel_type_text);

            var prevent = false
            for(var i = 0; i !== locked.length; ++i) {
                const channel = locked[i];
                if (
                    message.guild.channels.cache.get(channel).type === 'category' && 
                    enableChannel.parent && 
                    message.guild.channels.cache.get(channel).id === enableChannel.parent.id
                ) prevent = true;
            }

            if (prevent) return message.reply('This channel\'s category is currently disabled, therefore you cannot enable this channel')

            const alreadyEnabled = await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: enableChannel.id
            })

            if (!alreadyEnabled || alreadyEnabled.length === 0) {
                return message.reply('Commands are already enabled in this channel! `allowcmds viewdisabled` to view disabled command channels')
            }

            await settingsSchema.updateOne({
                guildID: message.guild.id,
            },
                {
                    $pull: {
                        locked: enableChannel.id
                    }
                })
            message.reply(`Commands in ${enableChannel} have been enabled`)
            break;
        case 'enablecategory':
            const enableCategory = message.guild.channels.cache.find(c => c.name === args.slice(2).join(' ')) || message.guild.channels.cache.get(args[2])
            if (!enableCategory) return message.reply('Please specify the category name you want to enable commands in')
            if (enableCategory.type !== 'category') return message.reply('Please specify a category name only')

            const alreadyEnabledCategory = await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: enableCategory.id
            })
            if (!alreadyEnabledCategory || alreadyEnabledCategory.length === 0) {
                return message.reply('Commands are already enabled in this category! `allowcmds viewdisabled` to view disabled command channels')
            }

            await settingsSchema.updateOne({
                guildID: message.guild.id,
            },
                {
                    $pull: {
                        locked: enableCategory.id
                    }
                })

            for(var i = 0; i !== locked.length; ++i) {
                const channel = locked[i];
                if (channel.parent && message.guild.channels.cache.get(channel).parent.id === disableCategory.id) {
                    await settingsSchema.updateOne({
                        guildid: message.guild.id
                    },
                        {
                            $pull: {
                                locked: channel
                            }
                        })
                }
            }

            message.reply(`Commands in the category \`${enableCategory.name}\` have been enabled`)
            break;

        case 'disable':
            const disableChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2])
            if (!disableChannel) return message.reply('Please specify the channel you wish to manage')
            if (disableChannel.type !== 'text') return message.reply('The channel must only be a text channel!')

            var prevent = false
            for(var i = 0; i !== locked.length; ++i) {
                const channel = locked[i];
                if (
                    message.guild.channels.cache.get(channel).type === 'category' &&
                    disableChannel.parent && 
                    message.guild.channels.cache.get(channel).id === disableChannel.parent.id
                ) prevent = true;
            }
            if (prevent) return message.reply('This channel\'s category is currently disabled, therefore you cannot disable this channel')

            const alreadyDisabled = await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: disableChannel.id
            })

            if (alreadyDisabled && !alreadyDisabled.length) {
                return message.reply('Commands are already disabled in this channel! `allowcmds viewdisabled` to view disabled command channels')
            }

            await settingsSchema.updateOne({
                guildID: message.guild.id,
            },
                {
                    $push: {
                        locked: disableChannel.id
                    }
                })
            message.reply(`Commands in ${disableChannel} have been disabled`)
            break;
        case 'disablecategory':
            const disableCategory = message.guild.channels.cache.find(c => c.name === args.slice(2).join(' ')) || message.guild.channels.cache.get(args[2])
            if (!disableCategory) return message.reply('Please specify the category name you want to disable commands in')
            if (disableCategory.type !== 'category') return message.reply('Please specify a category name only')

            const alreadyDisabledCategory = await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: disableCategory.id
            })
            if (alreadyDisabledCategory && !alreadyDisabledCategory.length) {
                return message.reply('Commands are already disabled in this category! `allowcmds viewdisabled` to view disabled command channels')
            }

            await settingsSchema.updateOne({
                guildID: message.guild.id,
            },
                {
                    $push: {
                        locked: disableCategory.id
                    }
                })

            for(var i = 0; i !== locked.length; ++i) {
                const channel = locked[i];
                if (channel.parent && message.guild.channels.cache.get(channel).parent.id === disableCategory.id) {
                    await settingsSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            $pull: {
                                locked: channel
                            }
                        })
                }
            }

            message.reply(`Commands in the category \`${disableCategory.name}\` have been disabled`)
            break;
        case 'enableall':
            await settingsSchema.updateOne({
                guildID: message.guild.id,
            },
                {
                    locked: []
                })
            message.reply(`All channels now allow commands`)
            break;
        case 'viewdisabled':
            if (locked === null || !locked.length) return message.reply('No channels currrently prevent commands. Want to add some? `allowcmds disable (channel)`')
            const disabledCommandChannels = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setAuthor(`Disabled command channels for ${message.guild.name}`, client.user.displayAvatarURL())

            const disabledChannels = [];
            const disabledCategories = [];
            for(var i = 0; i !== locked.length; ++i) {
                const channel = locked[i];
                if (!message.guild.channels.cache.get(channel) || message.guild.channels.cache.get(channel).type === 'GUILD_VOICE') {
                    await settingsSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            $pull: {
                                locked: channel
                            }
                        })
                } else {
                    if (message.guild.channels.cache.get(channel).type === 'category') {
                        disabledCategories.push(message.guild.channels.cache.get(channel).name)
                    } else {
                        disabledChannels.push(message.guild.channels.cache.get(channel))
                    }
                }
            }
            if (disabledCategories.length) disabledCommandChannels.addField('Categories', disabledCategories.join(', '))
            if (disabledChannels.length) disabledCommandChannels.addField('Channels', disabledChannels.join(', '))
            message.reply({ embeds: [disabledCommandChannels] })
            break;
        default:
            return message.reply('Invalid option! Options: enable, enablecateory, disable, disablecategory, viewdisabled')
    }
}