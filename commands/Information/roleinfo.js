const Discord = require('discord.js');

module.exports = {
    name: 'roleinfo',
    description: 'Get information on a role',
    usage: 'roleinfo [role]',
    aliases: ['roleinformation'],
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, 'Please specify a role to get information on!');
        const role = client.util.getRole(message.guild, args[0])
        || message.guild.roles.cache.find(r => r.name == args.join(' '))

        if (!role) return await client.util.throwError(message, client.config.errors.invalid_role);

        await message.guild.members.fetch();

        const roleInfoEmbed = new Discord.MessageEmbed()
            .setColor(role.hexColor !== '#000000' ? role.hexColor : client.config.colors.main)
            .setAuthor(`Role Information - ${role.name}`, client.user.displayAvatarURL())
            .addField('Role Name', role.name, true)
            .addField('Role ID', role.id, true)
            .addField('Role Hex Color', `${role.hexColor}`)
            .addField('Amount of members with this role', `${role.members.size}`)
            .addField('Hoisted?', role.hoist ? "Yes" : "No", true)
            .addField('Created on', client.util.timestamp(role.createdAt))
            .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL())

        return message.reply({ embeds: [roleInfoEmbed] })
    }
}
