const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const warningSchema = require('../../schemas/warning-schema')

module.exports = {
    name: 'ban',
    description: 'Bans the specified member',
    usage: 'ban <member> [reason]',
    aliases: ['b', 'banish'],
    async execute(client, message, args) {
        const roletoolower = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I cannot ban this user, because my highest role is lower or the same than the provided members highest role')
            .setAuthor('Error', client.user.displayAvatarURL());

        const yourroletoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You cannot ban this user, because your role is either the same hoist or lower than the provided member')
            .setAuthor('Error', client.user.displayAvatarURL())

        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const moderator = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('This user is a moderator, therefore I cannot ban them')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to ban members. Please give me the `Ban Members` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.member.hasPermission('BAN_MEMBERS')) return message.channel.send(accessdenied);
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

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) return message.reply('There was an error catching this user. Maybe try a ping?')

        if (member) {
            if (member.id == '745401642664460319') return message.channel.send('I-')
            if (member.id == message.author.id) return message.channel.send('Why tho')
            if (member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(moderator);
            if (message.member.roles.highest.position < member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(roletoolower)
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
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + moment(new Date()).format('h:mm:ss, a');

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const banmsg = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${member} has been banned with ID \`${code}\` <a:check:800062847974375424>`)

        const baninfoCheck = await settingsSchema.findOne({
            guildid: message.guild.id,
        })

        const banmsgdm = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setAuthor('Razor Moderation', client.user.displayAvatarURL())
        .setTitle(`You were banned from ${message.guild.name}`)
        .addField('Reason', reason, true)
        .addField('Expires', 'never', true)
        .addField('Date', date)
        let { baninfo } = baninfoCheck
        if(baninfo !== 'none') banmsgdm.addField('Additional Information', baninfo, true)
        banmsgdm.setFooter(`Punishment ID: ${code}`)

        member.send(banmsgdm).catch(() => { return })

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
    }
}
