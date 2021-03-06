const Discord = require('discord.js');
const punishmentSchema = require('../../schemas/punishment-schema')
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'unmute',
    description: 'Unmutes the specified member in the server',
    usage: 'unmute <member>',
    aliases: ['unshut'],
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

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

        if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(accessdenied)
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
        if (!member) return message.reply('There was an error catching this member. Maybe try a ping?')

        var reason = args.splice(1).join(' ');
        if (!reason) {
            var reason = 'Unspecified'
        }

        const unmutemsg = new Discord.MessageEmbed()
            .setColor('#90fff2')
            .setDescription(`${member} has been unmuted <a:check:800062847974375424>`)

        const role = message.guild.roles.cache.find(x => x.name === 'Muted');

        if (!role) return message.channel.send(rolereq)
        if (message.guild.me.roles.highest.position <= role.position) return message.channel.send(roletoolower)
        member.roles.remove(role).catch(() => { return })

        message.channel.send(unmutemsg)

        await punishmentSchema.deleteOne({
            userID: member.id
        })
            .catch(() => { return })

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

    }
}