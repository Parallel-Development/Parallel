const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'membercount',
    description: 'Shows the number of members on the server',
    data: new SlashCommandBuilder().setName('membercount').setDescription('Shows the number of members on the server'),
    async execute(client, interaction, args) {
        const membercountDetailed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(interaction.guild))
            .setAuthor('Member Count', client.user.displayAvatarURL())
            .setTitle(
                `There are currently \`${interaction.guild.memberCount}\` members in \`${interaction.guild.name}\``
            )
            .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL())
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

        return interaction.reply({ embeds: [membercountDetailed] });
    }
};
