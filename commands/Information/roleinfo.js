const Discord = require('discord.js');

module.exports = {
    name: 'roleinfo',
    description: 'Get information on a role',
    usage: 'roleinfo [role]',
    aliases: ['roleinformation'],
    async execute(client, message, args) {

        if (!args[0]) return message.reply('Please specify a role to get information on!');
        const role = message.mentions.roles.first()
            || message.guild.roles.cache.find(r => r.name == args.join(' '))
            || message.guild.roles.cache.get(args[0]);

        if (!role) return message.reply(client.config.errorMessages.invalid_role);

        const roleInfoEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setAuthor(`Role info - ${role.name}`, client.user.displayAvatarURL())
            .addField('Role Name', role.name, true)
            .addField('Role ID', role.id, true)
            .addField('Amount of members with this role', role.members.size)
            .addField('Role Hex Color', role.hexColor, true)
            .addField('Hoisted?', role.hoist ? "Yes" : "No", true)
            .addField('Created on', client.util.timestamp(role.createdAt));

        return message.reply({ embeds: [roleInfoEmbed] })
    }
}
