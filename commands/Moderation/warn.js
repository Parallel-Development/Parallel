const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const moment = require('moment')
const ms = require('ms')

module.exports = {
    name: 'warn',
    description: 'Warns the specified member in the server',
    permissions: 'MANAGE_MESSAGES',
    moderationCommand: true,
    usage: 'warn <member> [reason]',
    aliases: ['strike', 'w'],
    async execute(client, message, args) {
        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have permission to warn members. Please give me the `Manage Messages` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL())

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const moderator = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('This user is an administrator, therefore I cannot warn them')
            .setAuthor('Error', client.user.displayAvatarURL());

        const yourroletoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You cannot warn this user, because your role is either the same hoist or lower than the provided member')
            .setAuthor('Error', client.user.displayAvatarURL())

        if (!message.guild.me.hasPermission('MANAGE_MESSAGES')) return message.channel.send(missingperms)

        if (!args[0]) return message.channel.send(missingarguser);

        var member;

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) return message.channel.send('Please specify a valid member | The member must be on the server')

        if (member) {
            if (member.id == '745401642664460319') return message.channel.send('no.')
            if (member.id == message.author.id) return message.channel.send('Why tho')
            if (member.hasPermission('ADMINISTRATOR')) return message.channel.send(moderator);
            if (message.member.roles.highest.position < member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send('I cannot warn this member, as their highest role is above or equal to me in hierarchy')
        }

        const deleteModerationCommand = await settingsSchema.findOne({
            guildid: message.guild.id,
            delModCmds: true
        })

        if (deleteModerationCommand) message.delete()

        let reason = args.splice(1).join(' ')
        if (!reason)  reason = 'Unspecified'

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        let caseInfo;

        // Make the warning have an expirtion date?

        const rawTime = reason.split(' ')[0]
        let time = ms(rawTime)
        if(!time) {
            const defaultWarningExpirationTime = await settingsSchema.findOne({
                guildid: message.guild.id
            });
            let { manualwarnexpire } = defaultWarningExpirationTime;
            if(manualwarnexpire !== 'disabled') {
                time = parseInt(manualwarnexpire);
            }
        }

        if(time) {
            reason = reason.split(' ').slice(1).join(' ')
            if (!reason) reason = 'Unspecified'

            caseInfo = {
                moderatorID: message.author.id,
                type: 'Warn',
                date: date,
                reason: reason,
                code: code,
                expires: new Date().getTime() + time
            }

            const warningCheck2 = await warningSchema.findOne({
                guildid: message.guild.id,
                userid: member.id
            })

            if (!warningCheck2) {
                await new warningSchema({
                    userid: member.id,
                    guildname: message.guild.name,
                    guildid: message.guild.id,
                    warnings: []
                }).save()
                await warningSchema.updateOne({
                    guildid: message.guild.id,
                    userid: member.id
                },
                    {
                        $push: {
                            warnings: caseInfo
                        }
                    })
            } else {
                await warningSchema.updateOne({
                    guildid: message.guild.id,
                    userid: member.id
                },
                    {
                        $push: {
                            warnings: caseInfo
                        }
                    })
            }

            const tempuserwarned = new Discord.MessageEmbed()
                .setColor('#ffec00')
                .setDescription(`${member} has been warned with ID \`${code}\` <a:check:800062847974375424>`)

            const tempwarndm = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                .setTitle(`You were warned in ${message.guild.name}!`)
                .addField('Reason', reason)
                .addField('Date', date, true)
                .addField('Expires', cleanTime(time))
                .setFooter(`Punishment ID: ${code}`)

            message.channel.send(tempuserwarned)

            member.send(tempwarndm).catch(() => { return })

            function cleanTime(amount) {
                let days = 0;
                let hours = 0;
                let minutes = 0;
                let seconds = amount / 1000;

                while (seconds >= 60) {
                    seconds -= 60;
                    minutes++
                }

                while (minutes >= 60) {
                    minutes -= 60;
                    hours++
                }

                while (hours >= 24) {
                    hours -= 24;
                    days++
                }

                let product = [];
                if (days > 0) product.push(`${Math.round(days)} days`)
                if (hours > 0) product.push(`${Math.round(hours)} hours`)
                if (minutes > 0) product.push(`${Math.round(minutes)} minutes`)
                if (seconds > 0) product.push(`${Math.round(seconds)} seconds`)

                return product.join(', ')

            }

            var file = require('../../structures/moderationLogging');
            file.run(client, 'Warned', message.member, member, message.channel, reason, cleanTime(time), code)

            return;

        }

        caseInfo = {
            moderatorID: message.author.id,
            type: 'Warn',
            date: date,
            reason: reason,
            code: code
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: member.id
        })

        if(!warningCheck) {
            await new warningSchema({
                userid: member.id,
                guildname: message.guild.name,
                guildid: message.guild.id,
                warnings: []
            }).save()
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: member.id
            },
            {
                $push: {
                    warnings: caseInfo
                }
            })
        } else {
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: member.id
            },
            {
                $push: {
                    warnings: caseInfo
                }
            })
        }

        const userwarned = new Discord.MessageEmbed()
            .setColor('#ffec00')
            .setDescription(`${member} has been warned with ID \`${code}\` <a:check:800062847974375424>`)

        const warndm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were warned in ${message.guild.name}!`)
            .addField('Reason', reason)
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.channel.send(userwarned)

        member.send(warndm).catch(() => { return })

        var file = require('../../structures/moderationLogging');
        file.run(client, 'Warned', message.member, member, message.channel, reason, null, code)

    }
}
