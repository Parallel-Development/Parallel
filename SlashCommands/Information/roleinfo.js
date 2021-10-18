const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'roleinfo',
    description: 'Get information on a role',
    data: new SlashCommandBuilder().setName('roleinfo').setDescription('Get information on a role')
    .addRoleOption(option => option.setName('role').setDescription('The role you are getting information on').setRequired(true)),
    async execute(client, interaction, args) {

        const role = client.util.getRole(interaction.guild, args['role']);

        await interaction.deferReply()
        await interaction.guild.members.fetch();

        const roleInfoEmbed = new Discord.MessageEmbed()
            .setColor(role.hexColor !== '#000000' ? role.hexColor : client.config.colors.main)
            .setAuthor(`Role Information - ${role.name}`, client.user.displayAvatarURL())
            .addField('Role Name', role.name, true)
            .addField('Role ID', role.id, true)
            .addField('Role Hex Color', `${role.hexColor}`)
            .addField('Amount of members with this role', `${role.members.size}`)
            .addField('Hoisted?', role.hoist ? "Yes" : "No", true)
            .addField('Created on', client.util.timestamp(role.createdAt))
            .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL())

        return interaction.reply({ embeds: [roleInfoEmbed] })
    }
}
