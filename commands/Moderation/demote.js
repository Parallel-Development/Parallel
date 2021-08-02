const Discord = require('discord.js');

module.exports = {
    name: 'demote',
    description: 'Remove all roles with staff permissions from a member',
    usage: 'demote [member]\ndemote [member] --dm\ndemote [member] --dm <reason>',
    aliases: ['removeallstaffroles', 'removeallmoderationroles'],
    permissions: 'ADMINISTRATOR',
    requiredBotPermission: 'MANAGE_ROLES',
    async execute(client, message, args) {

        if (!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_member);

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.channel.send(client.config.errorMessages.invalid_member);

        if (member.id === client.user.id) return message.channel.send(client.config.errorMessages.cannot_punish_myself);
        if (member.id === message.member.id) return message.channel.send(client.config.errorMessages.cannot_punish_yourself);
        if (member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.channel.send(client.config.errorMessages.hierarchy);
        if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(client.config.errorMessages.my_hierarchy);
        if (member === message.guild.owner) return message.channel.send(client.config.errorMessages.cannot_punish_owner);

        if(!member.roles.cache.size) return message.channel.send('This user does not have any roles');

        const memberRoles = [];
        for(var role of member.roles.cache.array()) {
            if(!(
                role.permissions.has('MANAGE_MESSAGES') ||
                role.permissions.has('MANAGE_CHANNELS') ||
                role.permissions.has('MANAGE_ROLES') ||
                role.permissions.has('VIEW_AUDIT_LOG') ||
                role.permissions.has('MANAGE_GUILD') ||
                role.permissions.has('MANAGE_NICKNAMES') ||
                role.permissions.has('KICK_MEMBERS') ||
                role.permissions.has('BAN_MEMBERS') ||
                role.permissions.has('MUTE_MEMBERS') ||
                role.permissions.has('DEAFEN_MEMBERS') ||
                role.permissions.has('MOVE_MEMBERS')
            )) memberRoles.push(role);
        };

        if(member.roles.cache.size === memberRoles.length) return message.channel.send('This user does not have any roles with staff permissions');
        member.roles.set(memberRoles, `Administrator: ${message.author.tag}`);

        const demotedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[1])
        .setDescription(`${client.config.emotes.success} ${member} has been demoted`)
        message.channel.send(demotedEmbed);

        if(args[1] === '--dm') {
            const reason = args.slice(2).join(' ') || 'Unspecified';
            const demotedDMEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setAuthor('Parallel Role Management', client.user.displayAvatarURL())
            .setTitle(`You were demoted in ${message.guild.name}`)
            .setDescription(reason)

            member.send(demotedDMEmbed);
        }

        return;

    }

}