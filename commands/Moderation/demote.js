const Discord = require('discord.js')

module.exports = {
    name: 'demote',
    descrition: 'Removes all staff roles (roles with `Manage Messages`) from the specified member',
    usage: 'demote <user>',
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have permission to run this command!')
            .setAuthor('Error', client.user.displayAvatarURL())

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have permission to demote this member. Please give me the `Manage Roles` permission and run again')

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send(accessdenied)
        if (!message.guild.me.hasPermission('MANAGE_ROLES')) return message.channel.send(missingperms)

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        if (!args[0]) return message.channel.send(missingarguser)

        var member;

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) return message.reply('please specify a valid member. Try pinging the user if ID\'s don\'t work')

        // Checks

        if (message.guild.me.roles.highest.position <= member.roles.highest.position) return message.channel.send('This member\'s highest role is below or equal in hierarchy, I can\'t demote them')
        if (message.member.roles.highest.position <= member.roles.highest.position) return message.channels.send('You cannot demote this member as their highest role has lower of equal hierarchy to your highest role')
        if (member.hasPermission('ADMINISTRATOR') && !message.guild.owner) return message.channel.send('You cannot demote another administrator')

        try {
            member.roles.cache.forEach(r => {
                if(r.permissions.has('MANAGE_MESSAGES')) {
                    member.roles.remove(r)
                }
            })
            const demoted = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setDescription(`${member} has been demoted`)
            .setAuthor('Member Demoted', client.user.displayAvatarURL())
            message.channel.send(demoted)
        } catch(err) {
            console.log(err)
            message.channel.send('An error occured whilst trying to remove roles of this member')
        }

    }
}