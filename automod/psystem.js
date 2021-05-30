const Discord = require('discord.js');
const systemSchema = require('../schemas/system-schema');
const warningSchema = require('../schemas/warning-schema');
const punishmentSchema = require('../schemas/punishment-schema');
const settingsSchema = require('../schemas/settings-schema');
const muteSchema = require('../schemas/mute-schema')
const moment = require('moment');

exports.run = async(client, message) => {

    if(message.member.hasPermission('MANAGE_MESSAGES')) return;
    const system = await systemSchema.findOne({
        guildid: message.guild.id
    })
    if(!system || system.system.length == 0) return;
    const userWarningsCount = await warningSchema.findOne({
        guildid: message.guild.id,
        userid: message.member.id
    });
    if(!userWarningsCount || userWarningsCount.warnings.length < 2) return;


    async function punish(amount) {
        const findPunishment = await systemSchema.findOne({
            guildid: message.guild.id,
            system: {
                $elemMatch: {
                    amount: amount
                }
            }
        })
        let punishment;
        let duration;
        const reason = `[SYSTEM] Reaching or exceeding **${amount}** warnings`;
        findPunishment.system.forEach(instance => {
            if(instance.amount == amount) {
                punishment = instance.punishment
                if(instance.duration) duration= instance.duration
            }
        })
        switch (punishment) {
            case 'kick':

                var date = new Date();
                date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

                var code = '';
                var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                var charsLength = chars.length
                for (var i = 0; i < 15; i++) {
                    code += chars.charAt(Math.floor(Math.random() * charsLength))
                }

                if(!message.guild.me.hasPermission('KICK_MEMBERS')) return;
                const kickmsg = new Discord.MessageEmbed()
                .setColor('#ff6f00')
                .setDescription(`[SYSTEM] ${message.member} has been kicked with ID \`${code}\` <a:check:800062847974375424>`)

                const kickmsgdm = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                .setTitle(`You were kicked from ${message.guild.name}!`)
                .addField('Reason', `[SYSTEM] Reaching or exceeding **${amount}** warnings`, true)
                .addField('Date', date)
                .setFooter(`Punishment ID: ${code}`)

                message.member.send(kickmsgdm).catch(() => { return })

                message.member.kick(reason).catch(() => {
                    return message.channel.send(roletoolower)
                })

                message.channel.send(kickmsg)

                const caseInfoKick = {
                    moderatorID: message.author.id,
                    type: 'Kick',
                    date: date,
                    reason: reason,
                    code: code
                }

                const warningCheckKick = await warningSchema.findOne({
                    guildid: message.guild.id,
                    userid: message.member.id
                })

                if (!warningCheckKick) {
                    await new warningSchema({
                        userid: member.id,
                        guildname: message.guild.name,
                        guildid: message.guild.id,
                        warnings: []
                    }).save()
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                    {
                        $push: {
                            warnings: caseInfoKick
                        }
                    })
                } else {
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                    {
                        $push: {
                            warnings: caseInfoKick
                        }
                    })
                }

                break;
            case 'mute':
                var date = new Date();
                date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

                var code = '';
                var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                var charsLength = chars.length
                for (var i = 0; i < 15; i++) {
                    code += chars.charAt(Math.floor(Math.random() * charsLength))
                }

                let muteRole = message.guild.roles.cache.find(r => r.name == 'Muted');

                if (!muteRole) {
                    const createRole = await message.guild.roles.create({
                        data: {
                            name: 'Muted'
                        }
                    })

                    message.guild.channels.cache.forEach(channel => {
                        channel.updateOverwrite(createRole, { SEND_MESSAGES: false })
                        channel.updateOverwrite(createRole, { ADD_REACTIONS: false })
                    })
                }

                const rmrolesonmute = await settingsSchema.findOne({
                    guildid: message.guild.id,
                    rmrolesonmute: true
                })

                if (rmrolesonmute) {
                    if (message.member.roles.cache.size >= 10) message.channel.send('Muting the member... | this may take a while due to having many roles')
                    var memberRoles = [];

                    await muteSchema.deleteMany({
                        guildid: message.guild.id,
                        userid: message.member.id
                    })

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
                    await message.member.roles.add(muteRole)
                } catch {
                    muteRole = message.guild.roles.cache.find(r => r.name == 'Muted')
                    await message.member.roles.add(muteRole).catch(() => { return })
                }
                await new punishmentSchema({
                    guildname: message.guild.name,
                    guildid: message.guild.id,
                    type: 'mute',
                    userID: message.member.id,
                    duration: 'permanent',
                    reason: reason,
                    expires: 'never'
                }).save();

                const mutemsg = new Discord.MessageEmbed()
                    .setColor('#ffec00')
                    .setDescription(`[SYSTEM] ${message.member} has been muted with ID \`${code}\` <a:check:800062847974375424>`)

                const mutemsgdm = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                    .setTitle(`You were permanently muted in ${message.guild.name}!`)
                    .addField('Reason', `[SYSTEM] Reaching or exceeding **${amount}** warnings`, true)
                    .addField('Date', date)
                    .setFooter(`Punishment ID: ${code}`)

                message.member.send(mutemsgdm).catch(() => { return })

                message.channel.send(mutemsg)

                const caseInfoMute = {
                    moderatorID: message.author.id,
                    type: 'Mute',
                    date: date,
                    reason: reason,
                    code: code
                }

                const warningCheckMute = await warningSchema.findOne({
                    guildid: message.guild.id,
                    userid: message.member.id
                })

                if (!warningCheckMute) {
                    await new warningSchema({
                        userid: member.id,
                        guildname: message.guild.name,
                        guildid: message.guild.id,
                        warnings: []
                    }).save()
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                        {
                            $push: {
                                warnings: caseInfoMute
                            }
                        })
                } else {
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                        {
                            $push: {
                                warnings: caseInfoMute
                            }
                        })
                }
                break;
            case 'ban':
                var date = new Date();
                date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

                var code = '';
                var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                var charsLength = chars.length
                for (var i = 0; i < 15; i++) {
                    code += chars.charAt(Math.floor(Math.random() * charsLength))
                }

                const banmsg = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`[SYSTEM] ${message.member} has been banned with ID \`${code}\` <a:check:800062847974375424>`)

                const baninfoCheck = await settingsSchema.findOne({
                    guildid: message.guild.id,
                })

                const banmsgdm = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                    .setTitle(`You were permanently banned from ${message.guild.name}!`)
                    .addField('Reason', reason, true)
                    .addField('Date', date)
                let { baninfo } = baninfoCheck
                if (baninfo !== 'none') banmsgdm.addField('Additional Information', baninfo, true)
                banmsgdm.setFooter(`Punishment ID: ${code}`)

                message.member.send(banmsgdm).catch(() => { return })
                
                message.guild.members.ban(message.member, { reason: reason })

                message.channel.send(banmsg)

                const caseInfoBan = {
                    moderatorID: message.author.id,
                    type: 'Ban',
                    date: date,
                    reason: reason,
                    code: code
                }

                const warningCheckBan = await warningSchema.findOne({
                    guildid: message.guild.id,
                    userid: message.member.id
                })

                if (!warningCheckBan) {
                    await new warningSchema({
                        userid: message.member.id,
                        guildname: message.guild.name,
                        guildid: message.guild.id,
                        warnings: []
                    }).save()
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                        {
                            $push: {
                                warnings: caseInfoBan
                            }
                        })
                } else {
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                        {
                            $push: {
                                warnings: caseInfoBan
                            }
                        })
                }

                break;
            case 'tempmute':
                var date = new Date();
                date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

                var code = '';
                var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                var charsLength = chars.length
                for (var i = 0; i < 15; i++) {
                    code += chars.charAt(Math.floor(Math.random() * charsLength))
                }

                let muteRole_ = message.guild.roles.cache.find(r => r.name == 'Muted');

                if (!muteRole_) {
                    const createRole_ = await message.guild.roles.create({
                        data: {
                            name: 'Muted'
                        }
                    })

                    message.guild.channels.cache.forEach(channel => {
                        channel.updateOverwrite(createRole_, { SEND_MESSAGES: false })
                        channel.updateOverwrite(createRole_, { ADD_REACTIONS: false })
                    })
                }

                const rmrolesonmute_ = await settingsSchema.findOne({
                    guildid: message.guild.id,
                    rmrolesonmute: true
                })

                if (rmrolesonmute_) {
                    if (message.member.roles.cache.size >= 10) message.channel.send('Muting the member... | this may take a while due to having many roles')
                    const memberRoles_ = [];

                    await muteSchema.deleteMany({
                        guildid: message.guild.id,
                        userid: message.member.id
                    })

                    message.member.roles.cache.forEach(r => {
                        memberRoles_.push(r.id)
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
                    await message.member.roles.add(muteRole_)
                } catch {
                    muteRole_ = message.guild.roles.cache.find(r => r.name == 'Muted')
                    await message.member.roles.add(muteRole_).catch(() => { return })
                }

                await new punishmentSchema({
                    guildname: message.guild.name,
                    guildid: message.guild.id,
                    type: 'mute',
                    userID: message.member.id,
                    duration: duration,
                    reason: reason,
                    expires: duration + new Date().getTime()
                }).save();

                const tempmutemsg = new Discord.MessageEmbed()
                    .setColor('#ffec00')
                    .setDescription(`[SYSTEM] ${message.member} has been muted with ID \`${code}\` <a:check:800062847974375424>`)

                const tempmutemsgdm = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                    .setTitle(`You were muted in ${message.guild.name}!`)
                    .addField('Reason', `[SYSTEM] Reaching or exceeding **${amount}** warnings`, true)
                    .addField('Expires', cleanTime(duration), true)
                    .addField('Date', date)
                    .setFooter(`Punishment ID: ${code}`)

                message.member.send(tempmutemsgdm).catch(() => { return })

                message.channel.send(tempmutemsg)

                const caseInfoTempMute = {
                    moderatorID: message.author.id,
                    type: 'Tempute',
                    expires: new Date().getTime() + duration,
                    date: date,
                    reason: reason,
                    code: code
                }

                const warningCheckTempMute = await warningSchema.findOne({
                    guildid: message.guild.id,
                    userid: message.member.id
                })

                if (!warningCheckTempMute) {
                    await new warningSchema({
                        userid: member.id,
                        guildname: message.guild.name,
                        guildid: message.guild.id,
                        warnings: []
                    }).save()
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                        {
                            $push: {
                                warnings: caseInfoTempMute
                            }
                        })
                } else {
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                        {
                            $push: {
                                warnings: caseInfoTempMute
                            }
                        })
                }
                break;
            case 'tempban':
                var date = new Date();
                date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

                var code = '';
                var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                var charsLength = chars.length
                for (var i = 0; i < 15; i++) {
                    code += chars.charAt(Math.floor(Math.random() * charsLength))
                }

                const banmsg_ = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setDescription(`[SYSTEM] ${message.member} has been banned with ID \`${code}\` <a:check:800062847974375424>`)

                const baninfoCheck_ = await settingsSchema.findOne({
                    guildid: message.guild.id,
                })

                const banmsgdm_ = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                    .setTitle(`You were banned from ${message.guild.name}!`)
                    .addField('Reason', reason, true)
                    .addField('Expires', cleanTime(duration), true)
                    .addField('Date', date)
                let baninfo_ = baninfoCheck_.baninfo
                if (baninfo_ !== 'none') banmsgdm_.addField('Additional Information', baninfo_, true)
                banmsgdm_.setFooter(`Punishment ID: ${code}`)

                message.member.send(banmsgdm_).catch(() => { return })

                await new punishmentSchema({
                    guildname: message.guild.name,
                    guildid: message.guild.id,
                    type: 'ban',
                    userID: message.member.id,
                    duration: duration,
                    reason: reason,
                    expires: new Date().getTime() + duration
                }).save();


                message.guild.members.ban(message.member, { reason: reason })

                message.channel.send(banmsg_)

                const caseInfoBan_ = {
                    moderatorID: message.author.id,
                    type: 'Ban',
                    expires: new Date().getTime() + duration,
                    date: date,
                    reason: reason,
                    code: code
                }

                const warningCheckBan_ = await warningSchema.findOne({
                    guildid: message.guild.id,
                    userid: message.member.id
                })

                if (!warningCheckBan_) {
                    await new warningSchema({
                        userid: message.member.id,
                        guildname: message.guild.name,
                        guildid: message.guild.id,
                        warnings: []
                    }).save()
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                        {
                            $push: {
                                warnings: caseInfoBan_
                            }
                        })
                } else {
                    await warningSchema.updateOne({
                        guildid: message.guild.id,
                        userid: message.member.id
                    },
                        {
                            $push: {
                                warnings: caseInfoBan_
                            }
                        })
                    }
                break;
            default:
                return;
        }
    }





    const userWarnings = userWarningsCount.warnings.filter(a => a.auto == true).length;
    let warningInstances = [];
    system.system.forEach(instance => {
        warningInstances.push(instance.amount)
    })
    let foundPerfectInstance = false;
    for(i of warningInstances) {
        if(i == userWarnings) foundPerfectInstance = true;
    }

    if(!foundPerfectInstance) {
        let potentials = [];
        for(i of warningInstances) {
            let potential = userWarnings - i;
            if(potential > 0) potentials.push(potential);
        }
        let distance = Math.min(...potentials);
        if(potentials.length == 0) return;
        let perfect = userWarnings - distance
        punish(perfect)
    } else {
        punish(userWarnings)
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