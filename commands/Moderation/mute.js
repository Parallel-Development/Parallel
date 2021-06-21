const Discord = require('discord.js');
const punishmentSchema = require('../../schemas/punishment-schema');
const settingsSchema = require('../../schemas/settings-schema');
const warningSchema = require('../../schemas/warning-schema')
const moment = require('moment')
const ms = require('ms');
const { isInteger } = require('mathjs');

module.exports = {
    name: 'mute',
    description: 'Mutes the specified member in the server',
    permissions: 'MANAGE_ROLES',
    moderationCommand: true,
    usage: 'mute <member> [reason]',
    aliases: ['silence', 'shut', 'm', 'stfu'],
    async execute(client, message, args) {
        const roletoolower = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I cannot mute this user because the muted role has a higher or the same hierarchy as me')
            .setAuthor('Error', client.user.displayAvatarURL());

        const yourroletoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You cannot mute this user, because your role is either the same hoist or lower than the provided member')
            .setAuthor('Error', client.user.displayAvatarURL())

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const moderator = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('This user is a moderator, therefore I cannot mute them')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to mute members. Please give me the `Manage Roles` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.guild.me.hasPermission('MANAGE_ROLES')) return message.channel.send(missingperms);

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        if (!args[0]) return message.channel.send(missingarguser);

        var member;

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) return message.channel.send('Please specify a valid member | The member must be on the server')

        if (member) {
            if (member.id == '745401642664460319') return message.channel.send('no.')
            if (member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(moderator)
            if (message.member.roles.highest.position < member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if (member.id == message.author.id) return message.channel.send('Why tho')
        }

        var role = message.guild.roles.cache.find(x => x.name === 'Muted');

        const check = await punishmentSchema.findOne({
            guildid: message.guild.id,
            type: 'mute',
            userID: member.id
        })

        if (!role) {
            const createRole = await message.guild.roles.create({
                data: {
                    name: 'Muted'
                }
            })

            message.guild.channels.cache.forEach(channel => {
                channel.updateOverwrite(createRole, { SEND_MESSAGES: false, ADD_REACTIONS: false })
            })

            role = createRole;
        }

        if (check) {

            if (member.roles.cache.has(role.id)) {
                const alreadyMuted = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setDescription('This user is already muted!')
                    .setAuthor('Error', client.user.displayAvatarURL())

                message.channel.send(alreadyMuted)
                return;
            } else {
                await punishmentSchema.deleteOne({
                    guildid: message.guild.id,
                    userID: member.id
                })

            }
        }

        const deleteModerationCommand = await settingsSchema.findOne({
            guildid: message.guild.id,
            delModCmds: true
        })

        if (deleteModerationCommand) message.delete()

        let reason = args.splice(1).join(' ');
        if (!reason) {
            reason = 'Unspecified'
        }

        let rmrolesonmute = await settingsSchema.findOne({
            guildid: message.guild.id,
            rmrolesonmute: true
        })

        if (rmrolesonmute) {
            if(member.roles.cache.size >= 10) message.channel.send('Muting the member... | this may take a while due to having many roles')
            const muteSchema = require('../../schemas/mute-schema')
            const memberRoles = [];

            await muteSchema.deleteMany({
                guildid: message.guild.id,
                userid: member.id
            })

            member.roles.cache.forEach(r => {
                memberRoles.push(r.id)
                member.roles.remove(r).catch(() => { return })
            })

            await new muteSchema({
                guildname: message.guild.name,
                guildid: message.guild.id,
                userid: member.id,
                roles: memberRoles
            }).save();
        }

        try {
            await member.roles.add(role)
        } catch (err) {
            return message.channel.send(roletoolower)
        }

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        // Tempmute?

        const rawTime = reason.split(' ')[0]
        let time = ms(rawTime)

        if(time) {
            reason = reason.split(' ').slice(1).join(' ')
            if(!reason) reason = 'Unspecified'

            const tempmutemsg = new Discord.MessageEmbed()
                .setColor('#ffec00')
                .setDescription(`${member} has been muted with ID \`${code}\` <a:check:800062847974375424>`)

            const tempmutemsgdm = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setAuthor('Parallel Moderation', client.user.displayAvatarURL())
                .setTitle(`You were muted in ${message.guild.name}!`)
                .addField('Reason', reason, true)
                .addField('Expires', cleanTime(time), true)
                .addField('Date', date)
                .setFooter(`Punishment ID: ${code}`)

            await new punishmentSchema({
                guildname: message.guild.name,
                guildid: message.guild.id,
                type: 'mute',
                userID: member.id,
                duration: time,
                reason: reason,
                expires: new Date().getTime() + time
            }).save();

            member.send(tempmutemsgdm).catch(() => { return })

            message.channel.send(tempmutemsg);

            const tempMutecaseInfo = {
                moderatorID: message.author.id,
                type: 'Tempmute',
                expires: new Date().getTime() + time,
                date: date,
                reason: reason,
                code: code
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
                            warnings: tempMutecaseInfo
                        }
                    })
            } else {
                await warningSchema.updateOne({
                    guildid: message.guild.id,
                    userid: member.id
                },
                    {
                        $push: {
                            warnings: tempMutecaseInfo
                        }
                    })
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

            var file = require('../../structures/moderationLogging');
            file.run(client, 'Muted', message.member, member, message.channel, reason, cleanTime(time), code)

            return;

        }

        await new punishmentSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            type: 'mute',
            userID: member.id,
            duration: 'permanent',
            reason: reason,
            expires: 'never'
        }).save();

        const mutemsg = new Discord.MessageEmbed()
            .setColor('#ffec00')
            .setDescription(`${member} has been muted with ID \`${code}\` <a:check:800062847974375424>`)


        const mutemsgdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Parallel Moderation', client.user.displayAvatarURL())
            .setTitle(`You were permanently muted in ${message.guild.name}!`)
            .addField('Reason', reason, true)
            .addField('Date', date)
            .setFooter(`Punishment ID: ${code}`)

        member.send(mutemsgdm).catch(() => { return })

        message.channel.send(mutemsg);

        const caseInfo = {
            moderatorID: message.author.id,
            type: 'Mute',
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
        file.run(client, 'Muted', message.member, member, message.channel, reason, null, code)

    }
}
