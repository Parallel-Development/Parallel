const Discord = require('discord.js');

module.exports = {
    name: 'addrole',
    description: 'Add a role to a member',
    usage: 'addrole [member] <role>',
    permissions: 'MANAGE_ROLES',
    requiredBotPermission: 'MANAGE_ROLES',
    aliases: ['addrole', 'grant', 'giverole'],
    async execute(client, message, args) {
        if(!args[0]) return message.reply(client.config.errorMessages.missing_argument_member);
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if(!member) return message.reply(client.config.errorMessages.invalid_member);

        if(!args[1]) return message.reply(client.config.errorMessages.missing_argument_role);
        const role = message.mentions.roles.first() || message.guild.roles.cache.find(r => r.name === args.slice(1).join(' ')) || message.guild.roles.cache.get(args[1]);
        if(!role) return message.reply(client.config.errorMessages.invalid_role);

        if(role.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.reply(client.config.errorMessages.hierarchy);
        if(role.position >= message.guild.me.roles.highest.position) return message.reply(client.config.errorMessages.my_hierarchy);
        if(role === message.guild.roles.everyone || roleMANAGEd) return message.reply(client.config.errorMessages.unmanagable_role);
        if(member.roles.cache.has(role.id)) return message.reply('This member already has this role!');

        member.roles.add(role, `Responsible Member: ${message.member.user.tag}`);
        const assignedRole = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} Role ${role} successfully assigned to member ${member}`);
        return message.reply({ embeds: [assignedRole] });
    }
}