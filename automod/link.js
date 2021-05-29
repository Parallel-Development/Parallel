const Discord = require('discord.js')
const automodSchema = require('../schemas/automod-schema')
const warningSchema = require('../schemas/warning-schema')
const punishmentSchema = require('../schemas/punishment-schema')
const settingsSchema = require('../schemas/settings-schema')
const moment = require('moment')
const preventDoubleIDS = new Set();

exports.run = async (client, message) => {

    const automodGrab = await automodSchema.findOne({
        guildid: message.guild.id
    })
    let { links, linkTempBanDuration, linkTempMuteDuration } = automodGrab

    const grabSettings = await settingsSchema.findOne({
        guildid: message.guild.id
    })
    let { autowarnexpire } = grabSettings

    if (links == 'delete') {
        message.delete()
        message.reply('links are not allowed!')
    }

    if (links == 'warn') {
        message.delete()
        if (preventDoubleIDS.has(message.author.id)) return;
        else {
            preventDoubleIDS.add(message.author.id);
            setTimeout(() => {
                preventDoubleIDS.delete(message.author.id)
            }, 3000)
        }
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        let caseInfo;

        if (autowarnexpire !== 'disable') {
            caseInfo = {
                moderatorID: message.guild.me.id,
                type: 'Warn',
                date: date,
                reason: '[RAZOR LINK DETECTION] Sending Links',
                code: code,
                expires: new Date().getTime() + parseInt(autowarnexpire),
                auto: true
            }
        } else {
            caseInfo = {
                moderatorID: message.guild.me.id,
                type: 'Warn',
                date: date,
                reason: '[RAZOR LINK DETECTION] Sending Links',
                code: code,
                auto: true
            }
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: message.author.id
        })

        if (!warningCheck) {
            await new warningSchema({
                userid: message.author.id,
                guildname: message.guild.name,
                guildid: message.guild.id,
                warnings: []
            }).save()
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        } else {
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        }

        const userwarned = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been warned with ID \`${code}\` for sending links <a:check:800062847974375424>`)

        const warndm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were warned in ${message.guild.name}`)
            .addField('Reason', '[RAZOR LINK DETECTION] Sending Links')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)
        if (autowarnexpire !== 'disabled') warndm.addField('Expires', cleanTime(autowarnexpire))

        message.channel.send(userwarned)

        message.member.send(warndm).catch(() => { return })

        var file = require('./psystem');
        file.run(client, message)
    }

    if (links == 'kick') {
        message.delete()
        if (preventDoubleIDS.has(message.author.id)) return;
        else {
            preventDoubleIDS.add(message.author.id);
            setTimeout(() => {
                preventDoubleIDS.delete(message.author.id)
            }, 3000)
        }
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const userkicked = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been kicked with ID \`${code}\` for sending links <a:check:800062847974375424>`)

        const kickdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were kicked from ${message.guild.name}`)
            .addField('Reason', '[RAZOR LINK DETECTION] Sending Links')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(kickdm).catch(() => { return })

        message.member.kick('[RAZOR LINK DETECTION] Sending Links').catch(() => { return })

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Kick',
            date: date,
            reason: '[RAZOR LINK DETECTION] Sending Links',
            code: code,
            auto: true
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: message.author.id
        })

        if (!warningCheck) {
            await new warningSchema({
                userid: message.author.id,
                guildname: message.guild.name,
                guildid: message.guild.id,
                warnings: []
            }).save()
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        } else {
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        }

        message.channel.send(userkicked)
    }

    if (links == 'mute') {
        message.delete()
        if (preventDoubleIDS.has(message.author.id)) return;
        else {
            preventDoubleIDS.add(message.author.id);
            setTimeout(() => {
                preventDoubleIDS.delete(message.author.id)
            }, 3000)
        }
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Mute',
            date: date,
            reason: '[RAZOR LINK DETECTION] Sending Links',
            code: code,
            auto: true
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: message.author.id
        })

        if (!warningCheck) {
            await new warningSchema({
                userid: message.author.id,
                guildname: message.guild.name,
                guildid: message.guild.id,
                warnings: []
            }).save()
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        } else {
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        }

        await new punishmentSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            type: 'mute',
            userID: message.member.id,
            duration: 'permanent',
            reason: '[RAZOR LINK DETECTION] Sending Links',
            expires: 'never'
        }).save();

        var role = message.guild.roles.cache.find(x => x.name === 'Muted');

        if (!role) {
            const createRole = await message.guild.roles.create({
                data: {
                    name: 'Muted'
                }
            })

            message.guild.channels.cache.forEach(channel => {
                channel.updateOverwrite(createRole, { SEND_MESSAGES: false })
            })
        }

        let rmrolesonmute = await settingsSchema.findOne({
            guildid: message.guild.id,
            rmrolesonmute: true
        })
        if (rmrolesonmute) {
            const muteSchema = require('../schemas/mute-schema')
            const memberRoles = [];
            message.member.roles.cache.forEach(r => {
                memberRoles.push(r.id)
                message.member.roles.remove(r).catch(() => { return })
            })
            await new muteSchema({
                guildname: message.guild.name,
                guildid: message.guild.id,
                userid: message.member.id,
                roles: memberRoles
            }).save();
        }

        try {
            await message.member.roles.add(role)
        } catch (err) {
            try {
                var role = message.guild.roles.cache.find(r => r.name == 'Muted')
                await message.member.roles.add(role)
            } catch (e) {
                return;
            }
        }

        const usermuted = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been muted with ID \`${code}\` for sending links <a:check:800062847974375424>`)

        const mutedm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were muted in ${message.guild.name}`)
            .addField('Reason', '[RAZOR LINK DETECTION] Sending Links')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(mutedm).catch(() => { return })

        message.channel.send(usermuted)
    }

    if (links == 'ban') {
        message.delete()
        if (preventDoubleIDS.has(message.author.id)) return;
        else {
            preventDoubleIDS.add(message.author.id);
            setTimeout(() => {
                preventDoubleIDS.delete(message.author.id)
            }, 3000)
        }
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Ban',
            date: date,
            reason: '[RAZOR LINK DETECTION] Sending Links',
            code: code,
            auto: true
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: message.author.id
        })

        if (!warningCheck) {
            await new warningSchema({
                userid: message.author.id,
                guildname: message.guild.name,
                guildid: message.guild.id,
                warnings: []
            }).save()
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        } else {
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        }

        const userbanned = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been banned with ID \`${code}\` for sending links <a:check:800062847974375424>`)

        const bandm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were banned from ${message.guild.name}`)
            .addField('Reason', '[RAZOR LINK DETECTION] Sending Links')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(bandm).catch(() => { return })

        message.guild.members.ban(message.member, { reason: '[RAZOR LINK DETECTION] Sending Links' }).catch(() => { return })

        message.channel.send(userbanned)
    }

    if (links == 'tempban') {
        message.delete()
        if (preventDoubleIDS.has(message.author.id)) return;
        else {
            preventDoubleIDS.add(message.author.id);
            setTimeout(() => {
                preventDoubleIDS.delete(message.author.id)
            }, 3000)
        }
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const usertempbanned = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been banned with ID \`${code}\` for sending links <a:check:800062847974375424>`)

        const tempbandm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were banned from ${message.guild.name}`)
            .addField('Reason', '[RAZOR LINK DETECTION] Sending Links')
            .addField('Expires', cleanTime(linkTempBanDuration), true)
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(tempbandm).catch(() => { return })

        message.guild.members.ban(message.member, { reason: '[RAZOR LINK DETECTION] Sending Links' }).catch(() => { return })

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Tempban',
            expires: new Date().getTime() +  linkTempBanDuration,
            date: date,
            reason: '[RAZOR LINK DETECTION] Sending Links',
            code: code,
            auto: true
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: message.author.id
        })

        if (!warningCheck) {
            await new warningSchema({
                userid: message.author.id,
                guildname: message.guild.name,
                guildid: message.guild.id,
                warnings: []
            }).save()
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        } else {
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        }

        await new punishmentSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            type: 'ban',
            userID: message.member.id,
            duration: linkTempBanDuration,
            reason: '[RAZOR LINK DETECTION] Sending Links',
            expires: new Date().getTime() +  linkTempBanDuration
        }).save();

        message.channel.send(usertempbanned)
    }

    if (links == 'tempmute') {
        message.delete()
        if (preventDoubleIDS.has(message.author.id)) return;
        else {
            preventDoubleIDS.add(message.author.id);
            setTimeout(() => {
                preventDoubleIDS.delete(message.author.id)
            }, 3000)
        }
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const usertempmuted = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been muted   \`${code}\` for sending links <a:check:800062847974375424>`)

        const tempmutedm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were muted in ${message.guild.name}`)
            .addField('Reason', '[RAZOR LINK DETECTION] Sending Links')
            .addField('Expires', cleanTime(linkTempMuteDuration), true)
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        var role = message.guild.roles.cache.find(x => x.name === 'Muted');

        if (!role) {
            const createRole = await message.guild.roles.create({
                data: {
                    name: 'Muted'
                }
            })

            message.guild.channels.cache.forEach(channel => {
                channel.updateOverwrite(createRole, { SEND_MESSAGES: false })
            })
        }

        let rmrolesonmute = await settingsSchema.findOne({
            guildid: message.guild.id,
            rmrolesonmute: true
        })
        if (rmrolesonmute) {
            const muteSchema = require('../schemas/mute-schema')
            const memberRoles = [];
            message.member.roles.cache.forEach(r => {
                memberRoles.push(r.id)
                message.member.roles.remove(r).catch(() => { return })
            })
            await new muteSchema({
                guildname: message.guild.name,
                guildid: message.guild.id,
                userid: message.member.id,
                roles: memberRoles
            }).save();
        }

        try {
            await message.member.roles.add(role)
        } catch (err) {
            try {
                var role = message.guild.roles.cache.find(r => r.name == 'Muted')
                await message.member.roles.add(role)
            } catch (e) {
                return;
            }
        }

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Tempmute',
            expires: new Date().getTime() +  linkTempMuteDuration,
            date: date,
            reason: '[RAZOR LINK DETECTION] Sending Links',
            code: code,
            auto: true
        }

        const warningCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: message.author.id
        })

        if (!warningCheck) {
            await new warningSchema({
                userid: message.author.id,
                guildname: message.guild.name,
                guildid: message.guild.id,
                warnings: []
            }).save()
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        } else {
            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: message.author.id
            },
                {
                    $push: {
                        warnings: caseInfo
                    }
                })
        }

        await new punishmentSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            type: 'mute',
            userID: message.member.id,
            duration: linkTempMuteDuration,
            reason: '[RAZOR LINK DETECTION] Sending Links',
            expires: new Date().getTime() +  linkTempMuteDuration
        }).save();

        message.member.send(tempmutedm).catch(() => { return })

        message.channel.send(usertempmuted)
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
