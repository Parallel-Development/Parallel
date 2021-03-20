const Discord = require('discord.js')
const automodSchema = require('../../schemas/automod-schema')
const ms = require('ms')
const { execute } = require('./settings')
const { filterDependencies } = require('mathjs')

module.exports = {
    name: 'automod',
    description: 'Manages the auto-moderation for the bot',
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('You do not have the required permissions to execute this command!')
        .setAuthor('Error', client.user.displayAvatarURL())

        if(!message.member.hasPermission('MANAGE_GUILD')) return message.channel.send(accessdenied)

        const automodList = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription('You are able to toggle what punishment a user will be given. The punishments are:\n> delete\n> warn\n> kick\n> mute\n> ban\n> tempban\n> tempmute\n\n\nYou can disable any trigger by inputting `disable`')
        .addField('filter', 'Toggle the punishment for if someone sends a word in the `Filter List`', true)
        .addField('filterlist', 'Add, remove, or view the list of filtered words', true)
        .addField('fast', 'Toggle the punishment for if someone sends messages too quickly', true)
        .addField('walltext', 'Toggle the puishment for if someone sends text in a wall-like form', true)
        .addField('flood', 'Toggle the punishment for is someone sends long spammy messages, flooding the chat', true)
        .addField('links', 'Toggle the punishment for if someone sends links in chat', true)
        .addField('invites', 'Toggle the punishment for if someone sends a Discord invite', true)
        .addField('massmetion', 'Toggle the punishment for if someone mentions 6 or more people', true)
        .setAuthor(`Auto-moderation for ${message.guild.name}`, client.user.displayAvatarURL())

        const option = args[0]
        const toggle = args[1]
        if(!option) return message.channel.send(automodList)

        const automodGrab = await automodSchema.find({
            guildid: message.guild.id
        })

        let { filter, filterList, fast, walltext, flood, links, invites, massmention} = automodGrab

        switch(option) {
            /*
            case 'filter':
                switch(toggle) {
                    case 'delete':
                        await automodSchema.updateOne({
                            guildid: message.guild.it
                        },
                        {
                            filter: 'delete'   
                        })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get their message deleted`)
                        break;
                    case 'warn':
                        await automodSchema.updateOne({
                            guildid: message.guild.it
                        },
                            {
                                filter: 'warn'
                            })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get warned`)
                        break;
                    case 'kick':
                        await automodSchema.updateOne({
                            guildid: message.guild.it
                        },
                            {
                                filter: 'kick'
                            })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get kicked`)
                        break
                    case 'mute':
                        await automodSchema.updateOne({
                            guildid: message.guild.it
                        },
                            {
                                filter: 'mute'
                            })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get muted`)
                        break;
                    case 'ban':
                        await automodSchema.updateOne({
                            guildid: message.guild.it
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
                            guildid: message.guild.it
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
                            guildid: message.guild.it
                        },
                        {
                                filter: 'tempmute',
                                duration: time
                        })
                        message.channel.send(`Users who send words on the \`Filtered List\` will get banned for ${rawTime}`)
                        break;
                    case 'disable':
                        automodSchema.findOneAndUpdate({
                            guildid: message.guild.id
                        },
                            {
                                filter: 'disabled'
                            })

                        message.channel.send('Users will no longer be punished for sending words in the `Filter list`')
                        break;
                    default:
                        return message.channel.send('Invalid setting!')
                }
                break;
            
            case 'filterlist':
                switch (toggle) {
                    case 'add':
                        var word = args.splice(2).join(' ')
                        if(!word) return message.channel.send('Please specify a word to add to the filter!')
                        const wordAlreadyInFilter = await automodSchema.find({
                            guildid: message.guild.id,
                            filterList: {
                                $elemMatch: {
                                    word
                                }
                            }
                        })
                        console.log(wordAlreadyInFilter)

                        if(wordAlreadyInFilter) return message.channel.send('This word is already in the filter! Run `automod filter view` to view the current list of filtered words')
                        await automodSchema.updateOne({
                            guildid: message.guild.id
                        },
                        {
                            $push: { filterList: word }
                        })
                        message.channel.send(`\`${word}\` has been added to the filter`)
                        break;
                    case 'remove':
                        var word = args.splice(2).join(' ')
                        if(!word) return message.channel.send('Please specify a word to remove from the filter')
                        const wordNotInFilter = await automodSchema.find({
                            guildid: message.guild.id,
                            filterList: {
                                $elemMatch: {
                                    word
                                }
                            }
                        })
                        if(!wordNotInFilter) return message.channel.send(`Could not find the word \`${word}\` on the filter. Run \`automod filter view\` to view the current list of filtered words`)
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
                        const filterViewList = new Discord.MessageEmbed()
                        .setColor('#09fff2')
                        .setAuthor(`Filter list for ${message.guild.name}`, client.user.displayAvatarURL())
                        .setDescription(`\`${filterList}\``)
                        message.channel.send(filterViewList)
                        break;
                    default:
                        return message.channel.send('Invalid setting!')
                }
                break;
            */
                
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
                }
                break;
            case 'walltext':
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
            case 'flood':
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
                }
                break;
            case 'massmention':
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
            default:
                return message.channel.send('Invalid option!')
        }
    }
}