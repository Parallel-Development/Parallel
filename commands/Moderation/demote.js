const Discord = require('discord.js')

module.exports = {
    name: 'demote',
    description: 'Removes all roles with staff permissions from the specified member',
    permissions: 'ADMINISTRATOR',
    moderationCommand: true,
    usage: 'demote <user>',
    async execute(client, message, args) {

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have permission to demote this member. Please give me the `Manage Roles` permission and run again')

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

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
        if (!member) return message.channel.send('Please specify a valid member | The member must be on the server')

        // Checks

        if (message.guild.me.roles.highest.position <= member.roles.highest.position) return message.channel.send('This member\'s highest role is below or equal in hierarchy, I can\'t demote them')
        if (message.member.roles.highest.position <= member.roles.highest.position) return message.channels.send('You cannot demote this member as their highest role has lower of equal hierarchy to your highest role')
        if (member.hasPermission('ADMINISTRATOR') && !message.guild.owner) return message.channel.send('You cannot demote another administrator')

        const msg = await message.channel.send(`Removing staff roles from **${member.user.tag}**...`)

        try {
            member.roles.cache.forEach(r => {
                if(r.permissions.has('MANAGE_MESSAGES')
                || r.permissions.has('MANAGE_CHANNELS')
                || r.permissions.has('MANAGE_ROLES')
                || r.permissions.has('VIEW_AUDIT_LOG')
                || r.permissions.has('MANAGE_GUILD')
                || r.permissions.has('MANAGE_NICKNAMES')
                || r.permissions.has('KICK_MEMBERS')
                || r.permissions.has('BAN_MEMBERS')
                || r.permissions.has('MUTE_MEMBERS')
                || r.permissions.has('DEAFEN_MEMBERS')
                || r.permissions.has('MOVE_MEMBERS')) {
                    member.roles.remove(r)
                }
            })
            const demoted = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setDescription(`${member} has been demoted`)
            .setAuthor('Member Demoted', client.user.displayAvatarURL())
            await msg.delete()
            message.channel.send(demoted)
        } catch(err) {
            console.log(err)
            msg.edit('An error occured whilst trying to remove roles of this member')
        }

    }
}
