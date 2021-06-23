const Discord = require('discord.js');
const serverCooldown = new Set();
const punishmentSchema = require('../../schemas/punishment-schema')
const warningSchema = require('../../schemas/warning-schema')
const ms = require('ms')
const moment = require('moment')

module.exports = {
    name: 'massban',
    description: 'Ban up to 15 users at the same time',
    usage: 'massban <users>',
    permissions: 'BAN_MEMBERS',
    moderationCommand: true,
    async execute(client, message, args) {
        if (serverCooldown.has(message.guild.id)) return message.channel.send('This server is on cooldown')

        const users = message.mentions.users;
        if(users.size == 0) return message.channel.send('Please mention at least 1 user to ban!')
        if(users.size > 15) return message.channel.send('The max amount of users you can massban is 15')

        let reason;
        let duration;
        let count = 0;

        const msg = await message.channel.send('For what reason? `cancel` to cancel')
        let filter = m => m.author.id == message.author.id
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 120000, max: 3 })
        collector.on('collect', async(message) => {
            if(count == 0) {
                message.delete();
                if(message.content == 'cancel') {
                    await msg.edit('Action Cancelled')
                    collector.stop();
                    return
                } else {
                    reason = message.content
                    await msg.edit('For what duration? `permanent` to make it permanent, `cancel` to cancel')
                    count++
                }
            } else if(count == 1) {
                message.delete();
                if(message.content == 'cancel') {
                    await msg.edit('Action Cancelled')
                    collector.stop();
                    return;
                } else if(message.content == 'permanent') {
                    duration = 'permanent'
                } else {
                    const rawTime = message.content
                    const time = ms(rawTime)
                    if(time == NaN) {
                        await msg.edit('An invalid time was provided, cancelled')
                        collector.stop();
                        return;
                    } else {
                        duration = time
                    }
                }

                await msg.edit(`\`${users.size}\` users set to be banned. To confirm, respond \`confirm\``)
                count++
            } else if(count == 2) {
                message.delete();
                if(message.content == 'confirm') {
                    banUser(client, message, msg, users, reason, duration)
                    collector.stop();

                    serverCooldown.add(message.guild.id)
                    setTimeout(() => {
                        serverCooldown.delete(message.guild.id)
                    }, 60000)

                } else {
                    await msg.edit('Action Cancelled')
                    collector.stop();
                }
            }
        })

    }
}


async function banUser(client, message, msg, users, reason, duration) {

    const settingsSchema = require('../../schemas/settings-schema');
    const baninfoCheck = await settingsSchema.findOne({
        guildid: message.guild.id,
    })

    let bannedAmount = 0;
    reason = `[MASSBAN] ${reason}`

    let date = new Date();
    date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

    await msg.edit(`Attempting to ban \`${users.size}\` users... <a:loading:834973811735658548>`)

    users.forEach(async(user) => {
        user = message.guild.members.cache.get(user.id)
        if (user.roles.highest.position >= message.member.roles.highest.position) return message.channel.send(`You cannot ban ${user} as their highest role is higher or equal to yours in hierarchy`)
        if (user.hasPermission('ADMINISTRATOR')) return await message.channel.send(`You cannot ban ${user} as they are an adninistrator`)
        if(user.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(`I cannot ban ${user} as their highest role is higher than or equal to mine in heirarchy`)

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        let banmsgdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Parallel Moderation', client.user.displayAvatarURL())
            .setTitle(`You were banned from ${message.guild.name}!`)
            .addField('Reason', reason, true)
        if (duration == 'permanent') banmsgdm.addField('Expires', 'Never', true)
        else {
            banmsgdm.addField('Expires', cleanTime(duration), true)
        }
        banmsgdm.addField('Date', date)
        let { baninfo } = baninfoCheck
        if (baninfo !== 'none') banmsgdm.addField('Additional Information', baninfo, true)
        banmsgdm.setFooter(`Punishment ID: ${code}`)


        user.send(banmsgdm).catch(() => { })
        message.guild.members.ban(user, { reason: reason })

        let caseInfo;
        if(duration == 'permanent') {
            caseInfo = {
                moderatorID: message.author.id,
                type: 'Ban',
                date: date,
                reason: reason,
                code: code
            }
        } else {
            caseInfo = {
                moderatorID: message.author.id,
                type: 'Tempban',
                expires: new Date().getTime() + duration,
                date: date,
                reason: reason,
                code: code
            }

            await new punishmentSchema({
                guildname: message.guild.name,
                guildid: message.guild.id,
                type: 'ban',
                userID: user.id,
                duration: duration,
                reason: reason,
                expires: new Date().getTime() + duration
            }).save();
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: user.id
        })

        if (!warningCheck) {
            await new warningSchema({
                userid: user.id,
                guildname: message.guild.name,
                guildid: message.guild.id,
                warnings: []
            }).save()
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: user.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        } else {
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: user.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        }

        var file = require('../../structures/moderationLogging');
        file.run(client, 'Banned', message.member, user, message.channel, reason, cleanTime(duration), code)
        bannedAmount++
    })

    await msg.edit('Process Complete <a:check:800062847974375424>')
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
