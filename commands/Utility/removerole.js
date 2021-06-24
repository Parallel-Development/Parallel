const Discord = require('discord.js')

module.exports = {
    name: 'removerole',
    descrition: 'Adds a role to the specified user',
    permissions: 'MANAGE_ROLES',
    moderationCommand: true,
    aliases: ['revokerole', 'rmrole', 'takerole'],
    usage: 'removerole <user> [role]',
    async execute(client, message, args) {

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have permission to remove roles. Please give me the `Manage Roles` permission and run again')

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingargrole = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Please specify a role to remove. You can mention the role or just specify the role name')

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
        if (!member) message.channel.send('Please specify a valid member ID | The member must be on the server')

        let role = message.mentions.roles.first()
        if (!args[0]) return message.channel.send(missingargrole)
        if (!role) {
            role = message.guild.roles.cache.find(r => r.name == args.slice(1).join(' '))
            if (!role) return message.channel.send(missingargrole)
        }

        if (message.member.roles.highest.position <= role.position) {
            return message.channel.send('You cannot remove this role as your role hierarchy is equal or below this role')
        }
        if (message.guild.me.roles.highest.position <= role.position) {
            return message.channel.send('I do not have permission to remove this role, as it is equal or below me in hierarchy')
        }
        if (!member.roles.cache.has(role.id)) {
            return message.channel.send('This member does not have this role!')
        }
        if(role == message.guild.roles.everyone) {
            return message.channel.send('This role is not removeable')
        }

        await member.roles.remove(role).catch(() => { return message.channel.send('An unexpected error occurred trying to remove this role') })
        const addedRole = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription((`Successfully removed the \`${role.name}\` role from ${member}`))
        message.channel.send(addedRole)
    }
}
