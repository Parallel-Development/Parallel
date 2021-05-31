const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const warningSchema = require('../../schemas/warning-schema')
const punishmentSchema = require('../../schemas/punishment-schema')
const moment = require('moment')
const ms = require('ms')

module.exports = {
    name: 'ban',
    description: 'Bans the specified member',
    permissions: 'BAN_MEMBERS',
    moderationCommand: true,
    usage: 'ban <member> [reason]',
    aliases: ['b', 'banish', 'gtfo'],
    async execute(client, message, args) {
        const roletoolower = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I cannot ban this user, because my highest role is lower or the same than the provided members highest role')
            .setAuthor('Error', client.user.displayAvatarURL());

        const yourroletoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You cannot ban this user, because your role is either the same hoist or lower than the provided member')
            .setAuthor('Error', client.user.displayAvatarURL())

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const moderator = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('This user is an administrator, therefore I cannot ban them')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to ban members. Please give me the `Ban Members` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.guild.me.hasPermission('BAN_MEMBERS')) return message.channel.send(missingperms);

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        if (!args[0]) return message.channel.send(missingarguser);

        var member;

        let userNotMember = false

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) {
            try {
                member = await client.users.fetch(args[0])
                userNotMember = true
            } catch {
                return message.channel.send('Please specify a valid member')
            }
        }

        if (member) {
            if (member.id == '745401642664460319') return message.channel.send('no.')
            if (member.id == message.author.id) return message.channel.send('Why tho')
            if (!userNotMember) if (member.hasPermission('ADMINISTRATOR')) return message.channel.send(moderator);
            if (!userNotMember) if (message.member.roles.highest.position <= member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if(!userNotMember) if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(roletoolower)
        }

        if(userNotMember) {
            message.guild.fetchBans().then(bans => {
                let bannedUser = bans.find(b => b.id == member.id)
                if (bannedUser) {
                    return message.channel.send(`**${member.tag}** is already banned`)
                }

            })
        }

        const deleteModerationCommand = await settingsSchema.findOne({
            guildid: message.guild.id,
            delModCmds: true
        })

        if (deleteModerationCommand) message.delete()

        var reason = args.splice(1).join(' ');
        if (!reason) {
            var reason = 'Unspecified'
        }

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const banmsg = new Discord.MessageEmbed()
            .setColor('#FF0000')
        if (!userNotMember) banmsg.setDescription(`${member} has been banned with ID \`${code}\` <a:check:800062847974375424>`)
        if (userNotMember) banmsg.setDescription(`**${member.tag}** has been banned with ID \`${code}\` <a:check:800062847974375424>`)

        const baninfoCheck = await settingsSchema.findOne({
            guildid: message.guild.id,
        })

        // Tempban?

        const rawTime = reason.split(' ')[0]
        let time;
        if (rawTime !== '') time = ms(rawTime)

        if(time) {
            reason = reason.split(' ').slice(1).join(' ')
            if (!userNotMember) {
                const banmsgdm = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                    .setTitle(`You were banned from ${message.guild.name}!`)
                    .addField('Reason', reason, true)
                    .addField('Expires', cleanTime(time), true)
                    .addField('Date', date)
                let { baninfo } = baninfoCheck
                if (baninfo !== 'none') banmsgdm.addField('Additional Information', baninfo, true)
                banmsgdm.setFooter(`Punishment ID: ${code}`)

                member.send(banmsgdm).catch(() => { return })
            }

            await new punishmentSchema({
                guildname: message.guild.name,
                guildid: message.guild.id,
                type: 'ban',
                userID: member.id,
                duration: time,
                reason: reason,
                expires: new Date().getTime() + time
            }).save();

            message.guild.members.ban(member, { reason: reason })

            message.channel.send(banmsg);

            const caseInfo = {
                moderatorID: message.author.id,
                type: 'Tempban',
                expires: new Date().getTime() + time,
                date: date,
                reason: reason,
                code: code
            }

            const warningCheck = await warningSchema.findOne({
                guildid: message.guild.id,
                userid: member.id
            })

            if (!warningCheck) {
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

            var file = require('../../structures/moderationLogging');
            file.run(client, 'Banned', message.author, member, message.channel, reason, cleanTime(time), code)

            return;

        }

        if (!userNotMember) {
            const banmsgdm = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                .setTitle(`You were permanently banned from ${message.guild.name}!`)
                .addField('Reason', reason, true)
                .addField('Date', date)
            let { baninfo } = baninfoCheck
            if (baninfo !== 'none') banmsgdm.addField('Additional Information', baninfo, true)
            banmsgdm.setFooter(`Punishment ID: ${code}`)

            member.send(banmsgdm).catch(() => { return })
        }

        message.guild.members.ban(member, { reason: reason })

        message.channel.send(banmsg);

        const caseInfo = {
            moderatorID: message.author.id,
            type: 'Ban',
            date: date,
            reason: reason,
            code: code
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: member.id
        })

        if (!warningCheck) {
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

        var file = require('../../structures/moderationLogging');
        file.run(client, 'Banned', message.author, member, message.channel, reason, null, code)
    }


}

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

