const Discord = require('discord.js');
const punishmentSchema = require('../../schemas/punishment-schema');
const settingsSchema = require('../../schemas/settings-schema');
const warningSchema = require('../../schemas/warning-schema')
const moment = require('moment')
const ms = require('ms')

module.exports = {
    name: 'mute',
    description: 'Mutes the specified member in the server',
    permissions: 'MANAGE_MESSAGES',
    moderationCommand: true,
    usage: 'mute <member> [reason]',
    aliases: ['silence', 'shut', 'm'],
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
            if (member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(moderator)
            if (message.member.roles.highest.position < member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if (member.id == message.author.id) return message.channel.send('Why tho')
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
            await member.roles.add(role)
        } catch (err) {
            try {
                var role = message.guild.roles.cache.find(r => r.name == 'Muted')
                await member.roles.add(role)
            } catch {
                return message.channel.send(roletoolower)
            }
        }

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date()).format('h:mm:ss, a');

        const check = await punishmentSchema.findOne({
            guildid: message.guild.id,
            type: 'mute',
            userID: member.id
        })

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

        // Tempmute?

        const rawTime = reason.split(' ')[0]
        const time = ms(rawTime)

        if(time) {
            reason = args.splice(2).join(' ')
            if(!reason) reason = 'Unspecified'

            const tempmutemsg = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setDescription(`${member} has been muted with ID \`${code}\` <a:check:800062847974375424>`)

            const tempmutemsgdm = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setAuthor('Razor Moderation', client.user.displayAvatarURL())
                .setTitle(`You were muted in ${message.guild.name}`)
                .addField('Reason', reason, true)
                .addField('Expires', rawTime, true)
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
            .setColor('#09fff2')
            .setDescription(`${member} has been muted with ID \`${code}\` <a:check:800062847974375424>`)


        const mutemsgdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were muted in ${message.guild.name}`)
            .addField('Reason', reason, true)
            .addField('Expires', 'never', true)
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
    }
}
