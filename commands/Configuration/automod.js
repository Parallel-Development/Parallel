const Discord = require('discord.js')
const automodSchema = require('../../schemas/automod-schema')
const ms = require('ms')
const { execute } = require('./settings')
const { filterDependencies } = require('mathjs')

module.exports = {
    name: 'automod',
    description: 'Manages the auto-moderation for the bot',
    permissions: 'MANAGE_GUILD',
    usage: 'automod <setting> [args]',
    async execute(client, message, args) {

        const automodList = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription('You are able to toggle what punishment a user will be given. The punishments are:\n> delete\n> warn\n> kick\n> mute\n> ban\n> tempban\n> tempmute\n\n\nYou can disable any trigger by inputting `disable`\n\n\nSyntax: \`automod (setting) [punishment]\`')
        .addField('filter', 'Toggle the punishment for if someone sends a word in the `Filter List`', true)
        .addField('filterlist', 'Add, remove, or view the list of filtered words', true)
        .addField('fast', 'Toggle the punishment for if someone sends messages too quickly', true)
        .addField('walltext', 'Toggle the puishment for if someone sends text in a wall-like form', true)
        .addField('duplication', 'Toggle the punishment for is someone sends repeative characters in their message', true)
        .addField('links', 'Toggle the punishment for if someone sends links in chat', true)
        .addField('invites', 'Toggle the punishment for if someone sends a Discord invite', true)
        .addField('bypass', 'Add or remove channels from the automod bypass list')
        .addField('massmention', 'Toggle the punishment for if someone mentions 5 or more individual users', true)
        .setAuthor(`Auto-moderation for ${message.guild.name}`, client.user.displayAvatarURL())

        const option = args[0]
        const toggle = args[1]
        if(!option) return message.channel.send(automodList)

        const automodGrab = await automodSchema.find({
            guildid: message.guild.id
        })

        switch(option) {
            case 'filter':
                switch(toggle) {
                    case 'delete':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            filter: 'delete'   
                        })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get their message deleted`)
                        break;
                    case 'warn':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                filter: 'warn'
                            })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get warned`)
                        break;
                    case 'kick':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                filter: 'kick'
                            })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get kicked`)
                        break
                    case 'mute':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                filter: 'mute'
                            })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get muted`)
                        break;
                    case 'ban':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                filter: 'ban'
                            })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get banned`)
                        break;
                    case 'tempban':
                        var rawTime = args[2]
                        if(!rawTime) return message.channel.send('Please specify a duration')
                        var time = ms(rawTime)
                        if(isNaN(time)) return message.channel.send('Please specify a valid duration')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            filter: 'tempban',
                            duration: time
                        })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get banned for ${rawTime}`)
                        break;
                    case 'tempmute':
                        var rawTime = args[2]
                        if (!rawTime) return message.channel.send('Please specify a duration')
                        var time = ms(rawTime)
                        if (isNaN(time)) return message.channel.send('Please specify a valid duration')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                                filter: 'tempmute',
                                duration: time
                        })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get muted for ${rawTime}`)
                        break;
                    case 'disable':
                        await automodSchema.findOneAndUpdate({
                            guildid: message.guild.id
                        },
                            {
                                filter: 'disabled',
                                duration: 0
                            })

                        message.channel.send('Users will no longer be punished for sending words in the `Filter list`')
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
                switch (toggle) {
                    case 'add':
                        var word = args.splice(2).join(' ')
                        if(!word) return message.channel.send('Please specify a word to add to the filter!')
                        const wordAlreadyInFilter = await automodSchema.find({
                            guildid: message.guild.id,
                            filterList: word
                        })
    
                        if(wordAlreadyInFilter && wordAlreadyInFilter.length != 0) return message.channel.send('This word is already in the filter! Run `automod filter view` to view the current list of filtered words')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            $push: { filterList: word.toLowerCase() }
                        })
                        message.channel.send(`\`${word.toLowerCase()}\` has been added to the filter`)
                        break;
                    case 'remove':
                        var word = args.splice(2).join(' ')
                        if(!word) return message.channel.send('Please specify a word to remove from the filter')
                        const wordNotInFilter = await automodSchema.find({
                            guildid: message.guild.id,
                            filterList: word
                        })

                        if(!wordNotInFilter || wordNotInFilter.length == 0) return message.channel.send(`Could not find the word \`${word}\` on the filter. Run \`automod filterlist view\` to view the current list of filtered words`)
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            $pull: { filterList: word }
                        })
                        message.channel.send(`\`${word}\` has been removed from the filter!`)
                        break;
                    case 'removeall':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            filterList: []
                        })
                        message.channel.send('Wiped all words from the filter')
                        break;
                    case 'view':
                        const noWordsInFilter = await automodSchema.findOne({
                            guildid: message.guild.id,
                        })

                        const { filterList } = noWordsInFilter
                        
                        if(filterList == null) return message.channel.send('No words are on the filter! Want to add some? `automod filterlist add (word)`')
                        if (filterList.length == 0) return message.channel.send('No words are on the filter! Want to add some? `automod filterlist add (word)`')
                        const filterViewList = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setAuthor(`Filter list for ${message.guild.name}`, client.user.displayAvatarURL())
                        .setDescription(`\`${filterList.join(', ')}\``)
                        message.channel.send(filterViewList)
                        break;
                    default:
                        if(!args[0]) {
                            return message.channel.send('Invalid option!')
                        } else {
                            return message.channel.send('Options: add, remove, removeall, view')
                        }
                }
                break;
            case 'fast':
                switch (toggle) {
                    case 'delete':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            fast: 'delete',
                            duration: 0,
                            rawDuration: 0
                        })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send fast message spam will get their spam deleted <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'warn':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                fast: 'warn',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                         .setColor('#09fff2')
                        .setDescription('Users who send fast message spam will get warned <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'kick':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                fast: 'kick',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send fast message spam will get kicked <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break
                    case 'mute':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                fast: 'mute',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send fast message spam will get muted <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'ban':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                fast: 'ban',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send fast message spam will get banned <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempban':
                        var rawTime = args[2];
                        if(!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if(isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                fast: 'tempban',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription(`Users who send fast message spam will get banned for \`${rawTime}\` <a:check:800062847974375424>`)
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempmute':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                fast: 'tempmute',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription(`Users who send fast message spam will get muted for \`${rawTime}\` <a:check:800062847974375424>`)
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'disable':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                fast: 'disbaled',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Fast message spam will no longer be filtered <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    default:
                        if (!args[0]) {
                            return message.channel.send('Invalid option!')
                        } else {
                            return message.channel.send('Please specify a punishment')
                        }
                }
                break;
            case 'walltext':
                switch (toggle) {
                    case 'delete':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                walltext: 'delete',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send walltext will get their spam deleted <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'warn':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                walltext: 'warn',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send walltext will get warned <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'kick':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                walltext: 'kick',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send walltext will get kicked <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break
                    case 'mute':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                walltext: 'mute',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send walltext will get muted <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'ban':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                walltext: 'ban',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send walltext will get banned <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempban':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                walltext: 'tempban',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Users who send walltext will get banned for \`${rawTime}\` <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempmute':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                walltext: 'tempmute',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Users who send walltext will get muted for \`${rawTime}\` <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'disable':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                walltext: 'disbaled',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Walltext no longer be filtered <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    default:
                        if (!args[0]) {
                            return message.channel.send('Invalid option!')
                        } else {
                            return message.channel.send('Please specify a punishment')
                        }
                }
                break;
            case 'duplication':
                switch (toggle) {
                    case 'delete':
                        break;
                    case 'warn':
                        break;
                    case 'kick':
                        break
                    case 'mute':
                        break;
                    case 'ban':
                        break;
                    case 'tempban':
                        break;
                    case 'tempmute':
                        break;
                }
                break;
            case 'links':
                switch (toggle) {
                    case 'delete':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                links: 'delete',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send links will get there message deleted <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'warn':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                links: 'warn',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send links will get warned <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'kick':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                links: 'kick',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send links will now get kicked <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break
                    case 'mute':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                links: 'mute',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send links will now get muted <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'ban':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                links: 'ban',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who send links will now get banned <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempban':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                links: 'tempban',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Users who send links will now get banned for \`${rawTime}\` <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempmute':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                links: 'tempmute',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Users who send links will now get muted for \`${rawTime}\` <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'disable':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                links: 'disbaled',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Links will no longer be filtered <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    default:
                        if (!args[0]) {
                            return message.channel.send('Invalid option!')
                        } else {
                            return message.channel.send('Please specify a punishment')
                        }
                }
                break;
            case 'invites':
                switch (toggle) {
                    case 'delete':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                invites: 'delete',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send discord invites will get there message deleted <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'warn':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                invites: 'warn',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send discord invites will get warned <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'kick':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                invites: 'kick',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send discord invites will now get kicked <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break
                    case 'mute':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                invites: 'mute',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send discord invites will now get muted <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'ban':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                invites: 'ban',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription('Users who send discord invites will now get banned <a:check:800062847974375424>')
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempban':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                invites: 'tempban',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Users who send discord invites will now get banned for \`${rawTime}\` <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempmute':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                invites: 'tempmute',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription(`Users who send discord invites will now get muted for \`${rawTime}\` <a:check:800062847974375424>`)
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'disable':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            invites: 'disbaled',
                            duration: 0,
                            rawDuration: 0
                        })
                        var success = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setDescription(`Invites will no longer be filtered <a:check:800062847974375424>`)
                        .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    default:
                        if (!args[0]) {
                            return message.channel.send('Invalid option!')
                        } else {
                            return message.channel.send('Please specify a punishment')
                        }
                }
                break;
            case 'massmention':
                switch (toggle) {
                    case 'delete':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                massmention: 'delete',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who ping 5+ people will get there message deleted <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'warn':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                massmention: 'warn',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who ping 5+ people will get warned <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'kick':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                massmention: 'kick',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who ping 5+ people will now get kicked <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break
                    case 'mute':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                massmention: 'mute',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who ping 5+ people will now get muted <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'ban':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                massmention: 'ban',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription('Users who ping 5+ people will now get banned <a:check:800062847974375424>')
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempban':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                massmention: 'tempban',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Users who ping 5+ people will now get banned for \`${rawTime}\` <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'tempmute':
                        var rawTime = args[2];
                        if (!rawTime) return message.channel.send('Please specify a duration!')
                        var time = ms(rawTime);
                        if (isNaN(time)) return message.channel.send('Please specify a valid time!')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                massmention: 'tempmute',
                                duration: time,
                                rawDuration: rawTime
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Users who ping 5+ people will now get muted for \`${rawTime}\` <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    case 'disable':
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                            {
                                massmention: 'disbaled',
                                duration: 0,
                                rawDuration: 0
                            })
                        var success = new Discord.MessageEmbed()
                            .setColor('#09fff2')
                            .setDescription(`Mass mention will no longer be filtered <a:check:800062847974375424>`)
                            .setAuthor('Automod Update', client.user.displayAvatarURL())
                        message.channel.send(success)
                        break;
                    default:
                        if (!args[0]) {
                            return message.channel.send('Invalid option!')
                        } else {
                            return message.channel.send('Please specify a punishment')
                        }
                }

                case 'bypass':
                    const bypassChannel = message.mentions.channels.first()

                    switch(toggle) {
                        case 'add':
                            if(!bypassChannel) return message.channel.send('Please mention the channel you want to add to the bypass list')
                            const alreadyInBypassList0 = await automodSchema.findOne({
                                guildid: message.guild.id,
                                bypassChannels: bypassChannel.id
                            })
                            if(alreadyInBypassList0 && alreadyInBypassList0.length !== 0)  return message.channel.send('This channel is already in the bypass list! You can view the list by running `automod bypass view`')
                            await automodSchema.updateOne({
                                guildid: message.guild.id
                            },
                            {
                                $push: {
                                    bypassChannels: bypassChannel.id
                                }
                            })
                            await message.channel.send(`${bypassChannel} has been added to the automod bypass list`)
                            break;
                        case 'remove':
                            if (!bypassChannel) return message.channel.send('Please mention the channel you want to add to the bypass list')
                            const alreadyInBypassList1 = await automodSchema.findOne({
                                guildid: message.guild.id,
                                bypassChannels: bypassChannel.id
                            })
                            if (!alreadyInBypassList1 || alreadyInBypassList1.length == 0) return message.channel.send('This channel is not in the bypass list! You can view the list by running `automod bypass view`')
                            await automodSchema.updateOne({
                                guildid: message.guild.id
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
                                guildid: message.guild.id
                            },
                                {
                                    bypassChannels: []
                                })
                            await message.channel.send(`All channels have been removed from the automod bypass list`)
                            break;
                        case 'view':
                            const channelsBypassed = await automodSchema.findOne({
                                guildid: message.guild.id,
                            })

                            const { bypassChannels } = channelsBypassed

                            if (bypassChannels == null) return message.channel.send('No channels are on the automod bypass list! Want to add some? `automod bypass add (channel)`')
                            if (bypassChannels.length == 0) return message.channel.send('No channels are on the automod bypass list! Want to add some? `automod bypass add (channel)`')
                            const bypassChannelsViewList = new Discord.MessageEmbed()
                                .setColor('#09fff2')
                                .setAuthor(`Bypassed channel list for ${message.guild.name}`, client.user.displayAvatarURL())
                                bypassChannels2 = new Array()
                                bypassChannels.forEach(async(channel) => {
                                    if(!message.guild.channels.cache.get(channel)) {
                                        await automodSchema.updateOne({
                                            guildid: message.guild.id
                                        },
                                        {
                                            $pull: {
                                                bypassChannels: channel
                                            }
                                        })
                                    } else {
                                        bypassChannels2.push(message.guild.channels.cache.get(channel))
                                    }
                                })

                                bypassChannelsViewList.setDescription(`${bypassChannels2.join(', ')}`)
                            message.channel.send(bypassChannelsViewList)
                            break;
                        default:
                            if (!args[0]) {
                                return message.channel.send('Invalid option!')
                            } else {
                                return message.channel.send('Options: add, remove, removeall, view')
                            }

                    }
                break;
            default:
                return message.channel.send('Invalid setting!')
        }
    }
}