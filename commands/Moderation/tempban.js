const Discord = require('discord.js');
const ms = require('ms');
const punishmentSchema = require('../../schemas/punishment-schema');
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const { duration } = require('moment');

module.exports = {
    name: 'tempban',
    description: 'Temporarily bans the specified member from the server',
    usage: 'tempban <member> <time> [reason]',
    async execute(client, message, args) {
        const yourroletoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You cannot ban this user, because your role is either the same hoist or lower than the provided member')
            .setAuthor('Error', client.user.displayAvatarURL())

        const roletoolower = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I cannot ban this user, because my highest role is lower or the same than the provided members highest role')
            .setAuthor('Error', client.user.displayAvatarURL());

        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified / Not in guild')
            .setAuthor('Error', client.user.displayAvatarURL());

        const moderator = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('This user is a moderator, therefore I cannot ban them')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to ban members. Please give me the `Ban Members` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        const notime = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('No valid time specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const badtimetoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('The time you input is not valid. Must be 1 second or longer. If you put a number bigger than one, you need to include a time decorator, like \`h\` for hours, or \`s\` for second\nExample: \`r!tempmute @Dummy#0000 5d Testing Purposes\`')
            .setAuthor('Error', client.user.displayAvatarURL());

        const badtimeNaN = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('The time you input is not valid. Must be a number\nExample: \`r!tempmute @Dummy#0000 5d Testing Purposes\`')
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
            if (member.id == message.author.id) return message.channel.send('Why tho')
            if (member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(moderator)
            if (message.member.roles.highest.position < member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if (member.roles.highest.position >= message.guild.me.roles.highest.position) {
                return message.channel.send(roletoolower)
            }
        }

        var rawTime = args[1];
        if (!rawTime) return message.channel.send(notime)
        var time = ms(rawTime)
        if (time == NaN) return message.channel.send(badtimeNaN)
        if (time < 1000) return message.channel.send(badtimetoolow)

        var reason = args.splice(2).join(' ');
        let silent = false;
        if (!reason) {
            var reason = 'Unspecified'
        }
        if (reason.startsWith('-s')) silent = true;
        if (silent) message.delete()

        const banmsg = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${member} has been temporarily banned <a:check:800062847974375424>`)

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        const tempbanmsgdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setAuthor('Razor Moderation', client.user.displayAvatarURL())
            .setTitle(`You were banned from ${message.guild.name}`)
            .addField('Reason', reason, true)
            .addField('Expires', rawTime, true)
            .addField('Date', date)
            .setFooter(`Punishment ID: ${code}`)

        await new punishmentSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            type: 'ban',
            userID: member.id,
            duration: time,
            reason: reason,
            expires: new Date().getTime() + time
        }).save();

        member.send(tempbanmsgdm).catch(() => { return })

        message.guild.members.ban(member, { reason: reason })

        if (!silent) message.channel.send(banmsg).catch(() => { return })

        await new warningSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            type: 'Tempban',
            userid: member.id,
            reason: reason,
            code: code,
            date: date
        }).save();
    }
}
