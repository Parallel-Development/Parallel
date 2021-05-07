const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema')
const warningSchema = require('../../schemas/warning-schema')
const moment = require('moment')
const muteSchema = require('../../schemas/mute-schema')

module.exports = {
    name: 'unmute',
    description: 'Unmutes the specified member in the server',
    permissions: 'MANAGE_MESSAGES',
    moderationCommand: true,
    usage: 'unmute <member>',
    aliases: ['unshut'],
    async execute(client, message, args) {

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to unmute members. Please give me the `Manage Roles` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        const rolereq = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I cannot unmute someone when the Muted role doesn\'t even exist')
            .setAuthor('Error', client.user.displayAvatarURL());

        const roletoolower = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I cannot unmute this user, because the muted role has the same or higher hierarchy as me')
            .setAuthor('Error', client.user.displayAvatarURL())

        const notmuted = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('This user is not currently muted!')
            .setAuthor('Error', client.user.displayAvatarURL())

        if (!message.guild.me.hasPermission('MANAGE_ROLES')) return message.channel.send(missingperms);

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

        var reason = args.splice(1).join(' ');
        if (!reason) var reason = 'Unspecified';

        const unmutemsg = new Discord.MessageEmbed()
            .setColor('#90fff2')
            .setDescription(`${member} has been unmuted <a:check:800062847974375424>`)

        const role = message.guild.roles.cache.find(x => x.name === 'Muted');
        const isMuted = await punishmentSchema.findOne({
            guildid: message.guild.id,
            userID: member.id,
            type: 'mute'
        })

        if (!role) return message.channel.send(rolereq)
        if (!member.roles.cache.get(role.id)) {
            if (!isMuted) return message.channel.send(notmuted)
        }
        if (!isMuted) {
            if (!member.roles.cache.get(role.id)) return message.channel.send(notmuted)
        }
        if (message.guild.me.roles.highest.position <= role.position) return message.channel.send(roletoolower)

        member.roles.remove(role).catch(() => { return })

        let rmrolesonmute = await settingsSchema.findOne({
            guildid: message.guild.id,
            rmrolesonmute: true
        })
        if (rmrolesonmute) {
            let getRolesToRemove = await muteSchema.findOne({
                guildid: message.guild.id,
            })
            if(getRolesToRemove) {
                var { roles } = getRolesToRemove;
                for (r of roles) {
                    member.roles.add(message.guild.roles.cache.get(r)).catch(() => { return })
                }
                await muteSchema.deleteMany({
                    guildid: message.guild.id,
                    userid: member.id
                })
            }
        }

        const deleteModerationCommand = await settingsSchema.findOne({
            guildid: message.guild.id,
            delModCmds: true
        })

        if (deleteModerationCommand) message.delete()

        message.channel.send(unmutemsg)

        await punishmentSchema.deleteMany({
            userID: member.id
        })
            .catch(() => { return })

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date().getTime() + 14400000).format('h:mm:ss A');

        const unmutedm = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setAuthor('You were unmuted', client.user.displayAvatarURL())
            .setTitle(`You were unmuted in ${message.guild.name}`)
            .addField('Reason', reason)
            .setFooter(moment(message.createdtimeStamp).format('MMMM Do YYYY'))
        member.send(unmutedm).catch(() => { return })

        const caseInfo = {
            moderatorID: message.author.id,
            type: 'Unmute',
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
