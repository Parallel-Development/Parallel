const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const moment = require('moment')

module.exports = {
    name: 'kick',
    description: 'Kicks a user from the server',
    permissions: 'KICK_MEMBERS',
    moderationCommand: true,
    usage: 'kick <member> [reason]',
    aliases: ['boot'],
    async execute(client, message, args) {
        const roletoolower = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I cannot kick this user, because my highest role is lower or the same than the provided members highest role')
            .setAuthor('Error', client.user.displayAvatarURL());

        const yourroletoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You cannot kick this user, because your role is either the same hoist or lower than the provided member')
            .setAuthor('Error', client.user.displayAvatarURL())

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const moderator = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('This user is an administrator, therefore I cannot kick them')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to kick members. Please give me the `Kick Members` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.guild.me.hasPermission('KICK_MEMBERS')) return message.channel.send(missingperms);

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
            if (member.hasPermission('ADMINISTRATOR')) return message.channel.send(moderator);
            if (message.member.roles.highest.position <= member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if (member.id == message.author.id) return message.channel.send('Why tho')
            if(member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(roletoolower);
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

        const kickmsgdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Parallel Moderation', client.user.displayAvatarURL())
            .setTitle(`You were kicked from ${message.guild.name}!`)
            .addField('Reason', reason, true)
            .addField('Date', date)
            .setFooter(`Punishment ID: ${code}`)

        member.send(kickmsgdm).catch(() => { return })

        const kickmsg = new Discord.MessageEmbed()
            .setColor('#ff6f00')
            .setDescription(`${member} has been kicked with ID \`${code}\` <a:check:800062847974375424>`)

        var file = require('../../structures/moderationLogging');
        file.run(client, 'Kicked', message.member, member, message.channel, reason, null, code)

        member.kick(reason)

        message.channel.send(kickmsg)

        const caseInfo = {
            moderatorID: message.author.id,
            type: 'Kick',
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
