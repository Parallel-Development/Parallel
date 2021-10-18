const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'membercount',
    description: 'Shows the number of members on the server',
    aliases: ['usercount'],
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('Shows the number of members on the server')
        .addBooleanOption(option =>
            option.setName('detailed').setDescription('Show more detailed membercount information')
        ),
    async execute(client, interaction, args) {
        await interaction.guild.members.fetch();
        await interaction.deferReply();

        const botCount = interaction.guild.members.cache.filter(u => u.user.bot).size;
        const humanCount = interaction.guild.members.cache.filter(u => !u.user.bot).size;

        if (args['detailed'] === true) {
            const membercountDetailed = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setTitle('Member Count')
                .setDescription(
                    `There are **${
                        interaction.guild.memberCount
                    }** members on this server. **${botCount}** of these members are bot accounts, and **${humanCount}** of these members are human accounts. To put that into a ratio, for every bot account there are around **${Math.floor(
                        humanCount / botCount
                    )}** human accounts. Out of all the members, around **${Math.floor(
                        (humanCount / interaction.guild.memberCount) * 100
                    )}%** of them are human accounts, and the remaining **${
                        100 - Math.floor((humanCount / interaction.guild.memberCount) * 100)
                    }%** are bot accounts`
                )
                .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL())
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            return interaction.editReply({ embeds: [membercountDetailed] });
        } else {
            const membercount = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setTitle('Member Count')
                .setDescription(
                    `There are **${interaction.guild.memberCount}** members on this server. **${botCount}** of these members are bot accounts, and **${humanCount}** of these members are human accounts`
                )
                .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL())
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            return interaction.editReply({ embeds: [membercount] });
        }
    }
};
