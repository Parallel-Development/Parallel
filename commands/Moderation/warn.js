const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'warn',
    description: 'Warns the specified member in the server',
    usage: 'warn <member> [reason]',
    aliases: ['strike'],
    async execute(client, message, args) {
        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have permission to warn members. Please give me the `Manage Messages` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL())

        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to run this command!')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const moderator = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('This user is a moderator, therefore I cannot ban them')
            .setAuthor('Error', client.user.displayAvatarURL());
        
        const yourroletoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You cannot ban this user, because your role is either the same hoist or lower than the provided member')
            .setAuthor('Error', client.user.displayAvatarURL())

        if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(accessdenied)
        if (!message.guild.me.hasPermission('MANAGE_MESSAGES')) return message.channel.send(missingperms)

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
        if (!member) return message.reply('There was an error catching this member. Maybe try a ping?')

        if (member) {
            if (member.id == '745401642664460319') return message.channel.send('I-')
            if (member.id == message.author.id) return message.channel.send('Why tho')
            if (member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(moderator);
            if (message.member.roles.highest.position < member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(roletoolower)
        }


        var reason = args.splice(1).join(' ')
        let silent = false;
        if (!reason) var reason = 'Unspecified'
        if (reason.startsWith('-s')) silent = true;
        if (silent) message.delete()

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        await new warningSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            type: 'Warn',
            userid: member.id,
            reason: reason,
            code: code,
            date: date
        }).save();

        const userwarned = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${member} has been warned with ID \`${code}\` <a:check:800062847974375424>`)

        const warndm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .addField('Date', date, true)
            .addField('Reason', reason, true)
            .addField('Punishment ID', code)
            .setAuthor(`You were warned in ${message.guild.name}!`, client.user.displayAvatarURL())

        if (!silent) message.channel.send(userwarned)

        member.send(warndm).catch(() => { return })

        const logCheckWarn = await settingsSchema.findOne({
            guildid: message.guild.id,
            logs: 'none'
        })

        if (!logCheckWarn) {
            const warnLog = new Discord.MessageEmbed()
                .setColor('#000066')
                .addField('User', member, true)
                .addField('User ID', member.id, true)
                .addField('Moderator', message.author, true)
                .addField('Date', date, true)
                .addField('Reason', reason, true)
                .addField('Punishment ID', code)
                .setAuthor('User Warned', client.user.displayAvatarURL())

            let webhooks = await message.guild.fetchWebhooks();
            let webhook = await webhooks.first();

            webhook.send({
                username: 'Razor',
                avatar: client.user.displayAvatarURL(),
                embeds: [warnLog]
            })
        }

    }
}