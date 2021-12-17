const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'membercount',
    description: 'Shows the number of members on the server',
    data: new SlashCommandBuilder().setName('membercount').setDescription('Shows the number of members on the server'),
    async execute(client, interaction, args) {

        await interaction.deferReply();
        await interaction.guild.members.fetch();

        const membercountDetailed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(interaction.guild))
            .setAuthor('Member Count', client.user.displayAvatarURL())
            .setTitle(
                `There are currently \`${interaction.guild.memberCount}\` members in \`${interaction.guild.name}\``
            )
            .setDescription(`**${interaction.guild.members.cache.filter(m => m.user.bot).size}** bots, **${interaction.guild.members.cache.filter(m => !m.user.bot).size}** humans`)
            .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL())
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

        return interaction.editReply({ embeds: [membercountDetailed] });
    }
};
