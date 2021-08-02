const Discord = require('discord.js')
const automodSchema = require('../../schemas/automod-schema')
const ms = require('ms')

module.exports = {
    name: 'automod',
    description: 'Manages the auto-moderation for the bot',
    permissions: 'MANAGE_GUILD',
    moderationCommand: true,
    usage: 'automod <setting> [args]',
    async execute(client, message, args) {

        const automodGrab = await automodSchema.findOne({
            guildID: message.guild.id
        })

        const {
            fastTempMuteDuration,
            fastTempBanDuration,
            filterTempMuteDuration,
            filterTempBanDuration,
            invitesTempMuteDuration,
            invitesTempBanDuration,
            linksTempMuteDuration,
            linksTempBanDuration,
            massmentionTempMuteDuration,
            massmentionTempBanDuration,
            walltextTempMuteDuration,
            walltextTempBanDuration,
            fast,
            filter,
            invites,
            links,
            massmention,
            walltext
        } = automodGrab

        const automodList = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription('You are able to toggle what punishment a user will be given. The punishments are:\n\n> delete\n> warn\n> kick\n> mute\n> ban\n> tempban\n> tempmute\n\n\nYou can disable any trigger by inputting `disable`\n\n\nSyntax: \`automod (setting) [punishment]\`')
            .addField('filter', `Toggled: \`${filterTempMuteDuration ? filter + ' for ' + client.util.convertMillisecondsToDuration(filterTempMuteDuration) : filterTempBanDuration ? filter + ' for ' + client.util.convertMillisecondsToDuration(filterTempBanDuration) : filter}\``, true)
            .addField('fast', `Toggled: \`${fastTempMuteDuration ? fast + ' for ' + client.util.convertMillisecondsToDuration(fastTempMuteDuration) : fastTempBanDuration ? fast + ' for ' + client.util.convertMillisecondsToDuration(fastTempBanDuration) : fast}\``, true)
            .addField('walltext', `Toggled: \`${walltextTempMuteDuration ? walltext + ' for ' + client.util.convertMillisecondsToDuration(walltextTempMuteDuration) : walltextTempBanDuration ? walltext + ' for ' + client.util.convertMillisecondsToDuration(walltextTempBanDuration) : walltext}\``, true)
            .addField('links', `Toggled: \`${linksTempMuteDuration ? links + ' for ' + client.util.convertMillisecondsToDuration(linksTempMuteDuration) : linksTempBanDuration ? links + ' for ' + client.util.convertMillisecondsToDuration(linksTempBanDuration) : links}\``, true)
            .addField('invites', `\`${invitesTempMuteDuration ? invites + ' for ' + client.util.convertMillisecondsToDuration(invitesTempMuteDuration) : invitesTempBanDuration ? invites + ' for ' + client.util.convertMillisecondsToDuration(invitesTempBanDuration) : invites}\``, true)
            .addField('massmention', `Toggled: \`${massmentionTempMuteDuration ? massmention + ' for ' + client.util.convertMillisecondsToDuration(massmentionTempMuteDuration) : massmentionTempBanDuration ? massmention + ' for ' + client.util.convertMillisecondsToDuration(massmentionTempBanDuration) : massmention}\``, true)
            .addField('filterlist', 'Add, remove, or view the list of filtered words', true)
            .addField('bypass', 'Add or remove channels from the automod bypass list')
            .setAuthor(`Auto-moderation for ${message.guild.name}`, client.user.displayAvatarURL())

        const option = args[0]
        const toggle = args[1]
        if (!option) return message.channel.send(automodList)

        const duration = args[2] ? ms(args[2]) : null
        if(!duration && (args[1] === 'tempmute' || args[1] === 'temban')) {
            if(!args[2]) return message.channel.send(client.config.errorMessages.missing_argument_duration)
            else return message.channel.send(client.config.errorMessages.bad_duration)
        } else if (duration && duration > 315576000000) return message.channel.send(client.config.errorMessages.time_too_long);

        // FUNCTIONS ================================================================================

        const updateFilter = async(type, duration = null) => {

            if(duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            filter: type,
                            filterTempBanDuration: duration
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            filter: type,
                            filterTempMuteDuration: duration
                        })
                }
            } else {

                if(type === 'disable') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            filter: type,
                            filterTempMuteDuration: 0,
                            filterTempBanDuration: 0
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            filter: type,
                            filterTempMuteDuration: 0,
                            filterTempBanDuration: 0
                        })
                }

            }
        }

        const updateFast = async(type, duration) => {
            if (duration) {
                if(type === 'tempban') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            fast: type,
                            fastTempBanDuration: duration
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            fast: type,
                            fastTempMuteDuration: duration
                        })
                }
            } else {

                if (type === 'disable') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            fast: type,
                            fastTempMuteDuration: 0,
                            fastTempBanDuration: 0
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            fast: type,
                            fastTempMuteDuration: 0,
                            fastTempBanDuration: 0
                        })
                }

            }
        }

        const updateWalltext = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            walltext: type,
                            walltextTempBanDuration: duration
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            walltext: type,
                            walltextTempMuteDuration: duration
                        })
                }
            } else {

                if (type === 'disable') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            walltext: type,
                            walltextTempMuteDuration: 0,
                            walltextTempBanDuration: 0
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            walltext: type,
                            walltextTempMuteDuration: 0,
                            walltextTempBanDuration: 0
                        })
                }

            }
        }

        const updateLinks = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            links: type,
                            linksTempBanDuration: duration
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            links: type,
                            linksTempMuteDuration: duration
                        })
                }
            } else {

                if (type === 'disable') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            links: type,
                            linksTempMuteDuration: 0,
                            linksTempBanDuration: 0
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            links: type,
                            linksTempMuteDuration: 0,
                            linksTempBanDuration: 0
                        })
                }

            }
        }

        const updateInvites = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            invites: type,
                            invitesTempBanDuration: duration
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            invites: type,
                            invitesTempMuteDuration: duration
                        })
                }
            } else {

                if (type === 'disable') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            invites: type,
                            invitesTempMuteDuration: 0,
                            invitesTempBanDuration: 0
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            invites: type,
                            invitesTempMuteDuration: 0,
                            invitesTempBanDuration: 0
                        })
                }

            }
        }

        const updateMassmention = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            massmention: type,
                            massmentionTempBanDuration: duration
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            massmention: type,
                            massmentionTempMuteDuration: duration
                        })
                }
            } else {

                if (type === 'disable') {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            massmention: type,
                            massmentionTempMuteDuration: 0,
                            massmentionTempBanDuration: 0
                        })
                } else {
                    await automodSchema.updateOne({
                        guildID: message.guild.id
                    },
                        {
                            massmention: type,
                            massmentionTempMuteDuration: 0,
                            massmentionTempBanDuration: 0
                        })
                }

            }
        }

        // =================================================================================================

        switch (option) {
            case 'filter':
                switch (toggle) {
                    case 'delete':
                        updateFilter('delete')
                        message.channel.send(`Members who send words on the \`Filtered List\` will get their message deleted`)
                        break;
                    case 'warn':
                        updateFilter('warn')
                        message.channel.send(`Members who send words on the \`Filtered List\` will get warned`)
                        break;
                    case 'kick':
                        updateFilter('kick')
                        message.channel.send(`Members who send words on the \`Filtered List\` will get kicked`)
                        break
                    case 'mute':
                        updateFilter('mute')
                        message.channel.send(`Members who send words on the \`Filtered List\` will get muted`)
                        break;
                    case 'ban':
                        updateFilter('ban')
                        message.channel.send(`Members who send words on the \`Filtered List\` will get banned`)
                        break;
                    case 'tempban':
                        updateFilter('tempban', duration)
                        message.channel.send(`Members who send words on the \`Filtered List\` will get banned for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                        break;
                    case 'tempmute':
                        updateFilter('tempmute', duration)
                        message.channel.send(`Members who send words on the \`Filtered List\` will get muted for  \`${client.util.convertMillisecondsToDuration(duration)}\``)
                        break;
                    case 'disable':
                        updateFilter('disable')
                        message.channel.send('Members will no longer be punished for sending words in the `Filter list`')
                        break;
                    default:
                        if (!args[0]) {
                            return message.channel.send('Invalid option!')
                        } else {
                            return message.channel.send('Please specify a punishment')
                        }
                }
                break;

            case 'filterlist':

                const word = args.slice(2).join(' ');
                if(!args[2] && (args[1] && args[1] !== 'remove' && args[1] !== 'removeall' && args[1] !== 'view')) return message.channel.send('Please specify a word');

                switch (toggle) {
                    case 'add':

                        const wordAlreadyInFilter = await automodSchema.find({
                            guildID: message.guild.id,
                            filterList: word
                        })

                        if (wordAlreadyInFilter && wordAlreadyInFilter.length != 0) return message.channel.send('This word is already in the filter! Run `automod filter view` to view the current list of filtered words')
                        await automodSchema.updateOne({
                            guildID: message.guild.id
                        },
                            {
                                $push: { filterList: word.toLowerCase() }
                            })
                        message.channel.send(`\`${word.toLowerCase()}\` has been added to the filter`)
                        break;
                    case 'remove':

                        const wordNotInFilter = await automodSchema.find({
                            guildID: message.guild.id,
                            filterList: word
                        })

                        if (!wordNotInFilter || !wordInFilter.length) return message.channel.send(`Could not find the word \`${word}\` on the filter. Run \`automod filterlist view\` to view the current list of filtered words`)
                        await automodSchema.updateOne({
                            guildID: message.guild.id
                        },
                            {
                                $pull: { filterList: word }
                            })
                        message.channel.send(`\`${word}\` has been removed from the filter!`)
                        break;
                    case 'removeall':
                        await automodSchema.updateOne({
                            guildID: message.guild.id
                        },
                            {
                                filterList: []
                            })
                        message.channel.send('Wiped all words from the filter')
                        break;
                    case 'view':
                        const noWordsInFilter = await automodSchema.findOne({
                            guildID: message.guild.id,
                        })

                        const { filterList } = noWordsInFilter

                        if (!filterList|| !filterList.length) return message.channel.send('No words are on the filter! Want to add some? `automod filterlist add (word)`')
                        const filterViewList = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setAuthor(`Filter list for ${message.guild.name}`, client.user.displayAvatarURL())
                            .setDescription(`\`${filterList.join(', ')}\``)
                        message.channel.send(filterViewList)
                        break;
                    default:
                        if (!args[1]) {
                            const noWordsInFilter_ = await automodSchema.findOne({
                                guildID: message.guild.id,
                            })

                            const { filterList } = noWordsInFilter_

                            if (!filterList || !filterList.length) return message.channel.send('No words are on the filter! Want to add some? `automod filterlist add (word)`')
                            const filterViewList_ = new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setAuthor(`Filter list for ${message.guild.name}`, client.user.displayAvatarURL())
                                .setDescription(`\`${filterList.join(', ')}\``)
                            message.channel.send(filterViewList_)
                            return;
                        } else {
                            return message.channel.send('Options: add, remove, removeall, view')
                        }
                }
                break;
            case 'fast':
                switch (toggle) {
                    case 'delete':
                        updateFast('delete')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send fast message spam will get their spam deleted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'warn':
                        updateFast('warn')
                        message.channel.send(new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`${client.config.emotes.success} Members who send fast message spam will get warned`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL()))
                        break;
                    case 'kick':
                        updateFast('kick')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send fast message spam will get kicked`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break
                    case 'mute':
                        updateFast('mute')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send fast message spam will get muted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'ban':
                        updateFast('ban')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send fast message spam will get banned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempban':
                        updateFast('tempban', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send fast message spam will get banned for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempmute':
                        updateFast('tempmute', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send fast message spam will get muted for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'disable':
                        updateFast('disable')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send fast message spam will no longer be automatically punished`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    default:
                        if (args[0]) {
                            return message.channel.send(client.config.errorMessages.missing_argument_option)
                        } else {
                            return message.channel.send(client.config.errorMessages.invalid_option)
                        }
                }
                break;
            case 'walltext':
                switch (toggle) {
                    case 'delete':
                        updateWalltext('delete');
                        var success = new Discord.MessageEmbed()
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send walltext will get their spam deleted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'warn':
                        updateWalltext('warn')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send walltext will get warned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'kick':
                        updateWalltext('kick')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send walltext will get kicked`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break
                    case 'mute':
                        updateWalltext('mute')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send walltext will get muted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'ban':
                        updateWalltext('ban')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send walltext will get banned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempban':
                        updateWalltext('tempban', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send walltext will get banned for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempmute':
                        updateWalltext('tempmute');
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send walltext will get muted for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'disable':
                        updateWalltext('disable', )
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send walltext will no longer be punished`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    default:
                        if (args[0]) {
                            return message.channel.send(client.config.errorMessages.missing_argument_option)
                        } else {
                            return message.channel.send(client.config.errorMessages.invalid_option)
                        }
                }
                break;
            case 'links':
                switch (toggle) {
                    case 'delete':
                        updateLinks('delete')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send links will get their message deleted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'warn':
                        updateLinks('warn')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send links will get warned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'kick':
                        updateLinks('kick')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send links will get kicked`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break
                    case 'mute':
                        updateLinks('mute')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send links will get muted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'ban':
                        updateLinks('ban')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send links will get banned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempban':
                        updateLinks('tempban', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send links will get banned for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempmute':
                        updateLinks('tempmute', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send links will get muted for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'disable':
                        updateLinks('disable')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send links will no longer be automatically punished`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    default:
                        if (args[0]) {
                            return message.channel.send(client.config.errorMessages.missing_argument_option)
                        } else {
                            return message.channel.send(client.config.errorMessages.invalid_option)
                        }
                }
                break;
            case 'invites':
                switch (toggle) {
                    case 'delete':
                        updateInvites('delete')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send invites will get their deleted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'warn':
                        updateInvites('warn')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send invites will get warned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'kick':
                        updateInvites('kick')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send invites will get kicked`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break
                    case 'mute':
                        updateInvites('mute')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send invites will get muted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'ban':
                        updateInvites('ban')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send invites will get banned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempban':
                        updateInvites('tempban', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send invites will get banned for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        message.channel.send(success)
                        break;
                    case 'tempmute':
                        updateInvites('tempmute', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send invites will get muted for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        message.channel.send(success)
                        break;
                    case 'disable':
                        updateInvites('disable')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who send invites will no longer get punished`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        message.channel.send(success)
                        break;
                    default:
                        if (args[0]) {
                            return message.channel.send(client.config.errorMessages.missing_argument_option)
                        } else {
                            return message.channel.send(client.config.errorMessages.invalid_option)
                        }
                }
                break;
            case 'massmention':
                switch (toggle) {
                    case 'delete':
                        updateMassmention('delete')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who mention 5+ users will get their message deleted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'warn':
                        updateMassmention('warn')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who mention 5+ users will get warned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'kick':
                        updateMassmention('kick')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who mention 5+ users will get kicked`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break
                    case 'mute':
                        updateMassmention('mute')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who mention 5+ users will get muted`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'ban':
                        updateMassmention('ban')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who mention 5+ users will get banned`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempban':
                        updateMassmention('tempban', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who mention 5+ users will get banned for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'tempmute':
                        updateMassmention('tempmute', duration)
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who mention 5+ users will get muted for \`${client.util.convertMillisecondsToDuration(duration)}\``)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    case 'disable':
                        updateMassmention('disable')
                        message.channel.send(
                            new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setDescription(`${client.config.emotes.success} Members who mention 5+ users will no longer get punished`)
                                .setAuthor('Automod Update', client.user.displayAvatarURL())
                        )
                        break;
                    default:
                        if (args[0]) {
                            return message.channel.send(client.config.errorMessages.missing_argument_option)
                        } else {
                            return message.channel.send(client.config.errorMessages.invalid_option)
                        }
                }
                break;
            case 'bypass':
                const bypassChannel = message.mentions.channels.first()

                switch (toggle) {
                    case 'add':
                        if (!bypassChannel) return message.channel.send(client.config.errorMessages.missing_argument_channel)
                        if (bypassChannel.type !== 'text') return message.channel.send(client.config.errorMessages.not_type_text_channel)
                        const alreadyInBypassList0 = await automodSchema.findOne({
                            guildID: message.guild.id,
                            bypassChannels: bypassChannel.id
                        })
                        if (alreadyInBypassList0 && alreadyInBypassList0.length !== 0) return message.channel.send('This channel is already in the bypass list! You can view the list by running `automod bypass view`')
                        await automodSchema.updateOne({
                            guildID: message.guild.id
                        },
                            {
                                $push: {
                                    bypassChannels: bypassChannel.id
                                }
                            })
                        await message.channel.send(`${bypassChannel} has been added to the automod bypass list`)
                        break;
                    case 'remove':
                        if (!bypassChannel) return message.channel.send(client.config.errorMessages.missing_argument_channel)
                        const alreadyInBypassList1 = await automodSchema.findOne({
                            guildID: message.guild.id,
                            bypassChannels: bypassChannel.id
                        })
                        if (!alreadyInBypassList1 || !alreadyInBypassList1.length) return message.channel.send('This channel is not in the bypass list! You can view the list by running `automod bypass view`')
                        await automodSchema.updateOne({
                            guildID: message.guild.id
                        },
                            {
                                $pull: {
                                    bypassChannels: bypassChannel.id
                                }
                            })
                        await message.channel.send(`${bypassChannel} has been removed from the automod bypass list`)
                        break;
                    case 'removeall':
                        await automodSchema.updateOne({
                            guildID: message.guild.id
                        },
                            {
                                bypassChannels: []
                            })
                        await message.channel.send(`All channels have been removed from the automod bypass list`)
                        break;
                    case 'view':
                        const channelsBypassed = await automodSchema.findOne({
                            guildID: message.guild.id,
                        })

                        const { bypassChannels } = channelsBypassed

                        if (!bypassChannels || !bypassChannels.length) return message.channel.send('No channels are on the automod bypass list! Want to add some? `automod bypass add (channel)`')
                        const bypassChannelsViewList = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setAuthor(`Bypassed channel list for ${message.guild.name}`, client.user.displayAvatarURL())
                        const bypassChannels2 = [];
                        for(var i = 0; i !== bypassChannels2.length; ++i) {
                            const channel = bypassChannels2[i];
                            if (!message.guild.channels.cache.get(channel) || message.guild.channels.cache.get(channel).type !== 'text') {
                                await automodSchema.updateOne({
                                    guildID: message.guild.id
                                },
                                    {
                                        $pull: {
                                            bypassChannels: channel
                                        }
                                    })
                            } else {
                                bypassChannels2.push(message.guild.channels.cache.get(channel))
                            }
                        }

                        bypassChannelsViewList.setDescription(bypassChannels2.join(', '))
                        message.channel.send(bypassChannelsViewList)
                        break;
                    default:
                        if (args[0]) {
                            return message.channel.send(client.config.errorMessages.missing_argument_option)
                        } else {
                            return message.channel.send(client.config.errorMessages.invalid_option)
                        }

                }
                break;
            default:
                return message.channel.send('Invalid setting!')
        }
    }
}
