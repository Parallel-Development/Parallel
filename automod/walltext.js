const Discord = require('discord.js')
const automodSchema = require('../schemas/automod-schema')
const warningSchema = require('../schemas/warning-schema')
const punishmentSchema = require('../schemas/punishment-schema')
exports.run = async (client, message) => {
    if (message.member.hasPermission('MANAGE_MESSAGES')) return;

    const automodGrab = await automodSchema.findOne({
        guildid: message.guild.id
    })
    let { walltext, duration, rawDuration } = automodGrab

    if (walltext == 'delete') {
        message.delete()
        message.reply('walltext is not allowed!')
    }

    if (walltext == 'warn') {
        message.delete()
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Warn',
            date: date,
            reason: '[AUTO] Walltext',
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

        const userwarned = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been warned with ID \`${code}\` <a:check:800062847974375424>`)

        const warndm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were warned in ${message.guild.name}`)
            .addField('Reason', '[AUTO] Walltext')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.channel.send(userwarned)

        message.member.send(warndm).catch(() => { return })
    }

    if (walltext == 'kick') {
        message.delete()
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const userkicked = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been kicked with ID \`${code}\` <a:check:800062847974375424>`)

        const kickdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were kicked from ${message.guild.name}`)
            .addField('Reason', '[AUTO] Walltext')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(kickdm).catch(() => { return })

        message.member.kick('[AUTO] Walltext').catch(() => { return })

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Kick',
            date: date,
            reason: '[AUTO] Walltext',
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

    if (walltext == 'mute') {
        message.delete()
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

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
            reason: '[AUTO] Walltext',
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
            userID: message.message.author.id,
            duration: 'permanent',
            reason: '[AUTO] Walltext',
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
            .setDescription(`${message.member} has been muted with ID \`${code}\` <a:check:800062847974375424>`)

        const mutedm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were muted in ${message.guild.name}`)
            .addField('Reason', '[AUTO] Walltext')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(mutedm).catch(() => { return })

        message.channel.send(usermuted)
    }

    if (walltext == 'ban') {
        message.delete()
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

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
            reason: '[AUTO] Walltext',
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
            .setDescription(`${message.member} has been banned with ID \`${code}\` <a:check:800062847974375424>`)

        const bandm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were banned from ${message.guild.name}`)
            .addField('Reason', '[AUTO] Walltext')
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(bandm).catch(() => { return })

        message.guild.members.ban(message.member, { reason: '[AUTO] Walltext' }).catch(() => { return })

        message.channel.send(userbanned)
    }

    if (walltext == 'tempban') {
        message.delete()
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const usertempbanned = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been banned with ID \`${code}\` <a:check:800062847974375424>`)

        const tempbandm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were banned from ${message.guild.name}`)
            .addField('Reason', '[AUTO] Walltext')
            .addField('Expires', rawDuration, true)
            .addField('Date', date, true)
            .setFooter(`Punishment ID: ${code}`)

        message.member.send(tempbandm).catch(() => { return })

        message.guild.members.ban(message.member, { reason: '[AUTO] Walltext' }).catch(() => { return })

        const caseInfo = {
            moderatorID: message.guild.me.id,
            type: 'Tempban',
            expires: new Date().getTime() + parseInt(duration),
            date: date,
            reason: '[AUTO] Walltext',
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
            userID: message.message.author.id,
            duration: duration,
            reason: '[AUTO] Walltext',
            expires: new Date().getTime() + parseInt(duration)
        }).save();

        message.channel.send(usertempbanned)
    }

    if (walltext == 'tempmute') {
        message.delete()
        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const usertempmuted = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${message.member} has been muted with ID \`${code}\` <a:check:800062847974375424>`)

        const tempmutedm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were muted in ${message.guild.name}`)
            .addField('Reason', '[AUTO] Walltext')
            .addField('Expires', rawDuration, true)
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
            expires: new Date().getTime() + parseInt(duration),
            date: date,
            reason: '[AUTO] Walltext',
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
            duration: duration,
            reason: '[AUTO] Walltext',
            expires: new Date().getTime() + parseInt(duration)
        }).save();

        message.member.send(tempmutedm).catch(() => { return })

        message.channel.send(usertempmuted)
    }
}
