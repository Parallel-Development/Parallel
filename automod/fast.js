const Discord = require('discord.js')
const automodSchema = require('../schemas/automod-schema')
const warningSchema = require('../schemas/warning-schema')
const punishmentSchema = require('../schemas/punishment-schema')
const settingsSchema = require('../schemas/settings-schema')
const moment = require('moment')
const preventDoubleIDS = new Set();

exports.run = async(client, message) => {

    const uselessVariables = true;

    const automodGrab = await automodSchema.findOne({
        guildid: message.guild.id
    })
    let { fast, fastTempBanDuration, fastTempMuteDuration } = automodGrab

    const grabSettings = await settingsSchema.findOne({
        guildid: message.guild.id
    })
    let { autowarnexpire } = grabSettings

    async function deleteMessages() {
        try {
            message.channel.messages.fetch({
                limit: 4
            }).then(messages => {
                let userMessages = []
                messages.filter(m => m.author.id == message.author.id).forEach(msg => userMessages.push(msg))
                message.channel.bulkDelete(userMessages)
            })
        } catch (e) {
            return;
        }
    }

    if(fast == 'delete') {
        deleteMessages();
        message.channel.send(`${message.member} slow down there!`)
    }

    if (fast == 'warn') {
        deleteMessages();
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

        if(autowarnexpire !== 'disable') {
            caseInfo = {
                moderatorID: message.guild.me.id,
                type: 'Warn',
                date: date,
                reason: '[AUTO] Fast Message Spam',
                code: code,
                expires: new Date().getTime() + parseInt(autowarnexpire)
            }
        } else {
            caseInfo = {
                moderatorID: message.guild.me.id,
                type: 'Warn',
                date: date,
                reason: '[AUTO] Fast Message Spam',
                code: code
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
            .setDescription(`${message.member} has been warned with ID \`${code}\` <a:check:800062847974375424>`)

        const warndm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were warned in ${message.guild.name}`)
            .addField('Reason', '[AUTO] Fast Message Spam')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)
        if (autowarnexpire !== 'disabled') warndm.addField('Expires', cleanTime(autowarnexpire))

        message.channel.send(userwarned)

        message.member.send(warndm).catch(() => { return })
    }

    if(fast == 'kick') {
        deleteMessages();
        if(preventDoubleIDS.has(message.author.id)) return;
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
            .setDescription(`${message.member} has been kicked with ID \`${code}\` for displaying fast message spam <a:check:800062847974375424>`)

        const kickdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were kicked from ${message.guild.name}`)
            .addField('Reason', '[AUTO] Fast Message Spam')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(kickdm).catch(() => { return })

        message.member.kick('[AUTO] Fast Message Spam').catch(() => { return })

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Kick',
            date: date,
            reason: '[AUTO] Fast Message Spam',
            code: code
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

    if(fast == 'mute') {
        deleteMessages();
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
            reason: '[AUTO] Fast Message Spam',
            code: code
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
            userID: message.author.id,
            duration: 'permanent',
            reason: '[AUTO] Fast Message Spam',
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
            } catch(e) {
                return;
            }
        }

        const usermuted = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been muted with ID \`${code}\` for displaying fast message spam <a:check:800062847974375424>`)

        const mutedm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were muted in ${message.guild.name}`)
            .addField('Reason', '[AUTO] Fast Message Spam')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(mutedm).catch(() => { return })

        message.channel.send(usermuted)
    }

    if(fast == 'ban') {
        deleteMessages();
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
            reason: '[AUTO] Fast Message Spam',
            code: code
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
            .setDescription(`${message.member} has been banned with ID \`${code}\` for displaying fast message spam <a:check:800062847974375424>`)

        const bandm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were banned from ${message.guild.name}`)
            .addField('Reason', '[AUTO] Fast Message Spam')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(bandm).catch(() => { return })

        message.guild.members.ban(message.member, { reason: '[AUTO] Fast Message Spam ' }).catch(() => { return })

        message.channel.send(userbanned)
    }

    if(fast == 'tempban') {
        deleteMessages();
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
            .setDescription(`${message.member} has been banned with ID \`${code}\` for displaying fast message spam <a:check:800062847974375424>`)

        const tempbandm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were banned from ${message.guild.name}`)
            .addField('Reason', '[AUTO] Fast Message Spam')
            .addField('Expires', cleanTime(fastTempBanDuration), true)
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(tempbandm).catch(() => { return })

        message.guild.members.ban(message.member, { reason: '[AUTO] Fast Message Spam '}).catch(() => { return })

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Tempban',
            expires: new Date().getTime() +  fastTempBanDuration,
            date: date,
            reason: '[AUTO] Fast Message Spam',
            code: code
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
            userID: message.author.id,
            duration: fastTempBanDuration,
            reason: '[AUTO] Fast Message Spam',
            expires: new Date().getTime() +  fastTempBanDuration
        }).save();

        message.channel.send(usertempbanned)
    }

    if(fast == 'tempmute') {
        deleteMessages();
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
            .setDescription(`${message.member} has been muted with ID \`${code}\` for displaying fast message spam <a:check:800062847974375424>`)

        const tempmutedm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were muted in ${message.guild.name}`)
            .addField('Reason', '[AUTO] Fast Message Spam')
            .addField('Expires', cleanTime(fastTempMuteDuration), true)
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
            expires: new Date().getTime() +  fastTempMuteDuration,
            date: date,
            reason: '[AUTO] Fast Message Spam',
            code: code
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
            duration: fastTempMuteDuration,
            reason: '[AUTO] Fast Message Spam',
            expires: new Date().getTime() +  fastTempMuteDuration
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
