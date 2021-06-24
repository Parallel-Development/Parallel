const Discord = require('discord.js')

module.exports = {
    name: 'addrole',
    description: 'Adds a role to the specified user',
    permissions: 'MANAGE_ROLES',
    moderationCommand: true,
    aliases: ['grant', 'giverole'],
    usage: 'addrole <user> [role]',
    async execute(client, message, args) {

        const missingperms = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('I do not have permission to give roles. Please give me the `Manage Roles` permission and run again')

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        const missingargrole = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('Please specify a role to grant. You can mention the role or just specify the role name')

        if(!message.guild.me.hasPermission('MANAGE_ROLES')) return message.channel.send(missingperms)

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
        if (!member) return message.channel.send('Please specify a valid member ID | The member must be on the server')

        let role = message.mentions.roles.first()
        if(!args[0]) return message.channel.send(missingargrole)
        if(!role) {
            role = message.guild.roles.cache.find(r => r.name == args.slice(1).join(' '))
            if(!role) return message.channel.send(missingargrole)
        }

        if(role.managable) return message.channel.send('You cannot add a bot role to a user!')

        if(message.member.roles.highest.position <= role.position) {
            return message.channel.send('You cannot grant this role as your role hierarchy is equal or below this role')
        }
        if(message.guild.me.roles.highest.position <= role.position) {
            return message.channel.send('I do not have permission to grant this role, as it is equal or below me in hierarchy')
        }
        if(member.roles.cache.has(role.id)) {
            return message.channel.send('This member already has that role!')
        }

        await member.roles.add(role).catch(() => { return message.channel.send('An unexpected error occurred while trying to add this role') })
        const addedRole = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription((`Successfully granted the \`${role.name}\` role to ${member}`))
        message.channel.send(addedRole)
    }
}
