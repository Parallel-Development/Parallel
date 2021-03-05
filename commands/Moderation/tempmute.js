const Discord = require('discord.js')
const ms = require('ms')
const punishmentSchema = require('../../schemas/punishment-schema')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'tempmute',
    description: 'Temporarily mutes the specified member in the server',
    usage: 'tempmute <member> [time] (reason)',
    async execute(client, message, args) {
        const roletoolower = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I cannot mute this user, because my highest role is lower or the same than the provided members highest role')
            .setAuthor('Error', client.user.displayAvatarURL());

        const yourroletoolow = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You cannot mute this user, because your role is either the same hoist or lower than the provided member')
            .setAuthor('Error', client.user.displayAvatarURL())

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
            .setDescription('This user is a moderator, therefore I cannot mute them')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to mute members. Please give me the `Manage Roles` permission and run again')
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

        if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(accessdenied);
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
        if (!member) return message.reply('There was an error catching this user. Maybe try a ping?')

        if (member) {
            if (member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(moderator)
            if (message.member.roles.highest.position < member.roles.highest.position) {
                return message.channel.send(yourroletoolow)
            }
            if (member.id == message.author.id) return message.channel.send('Why tho')
        }

        var rawTime = args[1];
        if (!rawTime) return message.channel.send(notime)
        var time = ms(rawTime)
        if (!time == !NaN) return message.channel.send(badtimeNaN)
        if (time < 1000) return message.channel.send(badtimetoolow)

        var reason = args.splice(2).join(' ');
        let silent = false;
        if (!reason) {
            var reason = 'Unspecified'
        }
        if (reason.startsWith('-s')) silent = true;
        if (silent) message.delete();

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

        const mutemsg = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${member} has been muted <a:check:800062847974375424>`)

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

        const tempmutemsgdm = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .addField('Date', date, true)
            .addField('Reason', reason, true)
            .addField('Duration', rawTime, true)
            .setAuthor(`You were muted in ${message.member.guild}!`, client.user.displayAvatarURL())

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
                    user: member.id
                })

            }
        }

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

        if (!silent) message.channel.send(mutemsg);

        var code = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charsLength = chars.length
        for (var i = 0; i < 15; i++) {
            code += chars.charAt(Math.floor(Math.random() * charsLength))
        }

        await new warningSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            type: 'Tempmute',
            userid: member.id,
            reason: reason,
            code: code,
            date: date
        }).save();
    }

}