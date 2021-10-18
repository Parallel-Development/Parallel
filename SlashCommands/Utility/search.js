const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'search',
    description: 'Search your server for a specified display name',
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search your server for a specified display name')
        .addStringOption(option =>
            option.setName('query').setDescription('The display name to search for').setRequired(true)
        )
        .addBooleanOption(option => option.setName('exact').setDescription('Exact your query')),
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, interaction, args) {
        const exact = args['exact'];
        const displayName = args['query'];
        if (!displayName)
            return interaction.reply({ content: 'Please specify a display name to search for!', ephmeral: true });

        await interaction.deferReply();

        await interaction.guild.members.fetch();
        const members = [];

        const result = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setAuthor(
                `Results for ${displayName} ${
                    exact ? '| The results shown are for users with the exact display name as specified' : ''
                }`,
                client.user.displayAvatarURL()
            );

        const _members = [...interaction.guild.members.cache.values()].filter(m =>
            m.displayName.toLowerCase().includes(displayName.toLowerCase())
        );
        for (let i = 0; i !== _members.length; ++i) {
            const member = _members[i];
            if (exact) {
                if (member.displayName.toLowerCase() === displayName.toLowerCase()) {
                    result.addField(
                        member.user.tag,
                        `ID: \`${member.id}\`\nUsername: \`${member.user.username}\`\nDisplay Name: \`${member.displayName}\``
                    );
                    members.push(member);
                }
            } else {
                if (member.displayName.toLowerCase().includes(displayName.toLowerCase())) {
                    result.addField(
                        member.user.tag,
                        `ID: \`${member.id}\`\nUsername: \`${member.user.username}\`\nDisplay Name: \`${member.displayName}\``
                    );
                    members.push(member);
                }
            }
        }

        if (!members.length)
            return interaction.editReply({
                embeds: [
                    new Discord.MessageEmbed().setColor(client.config.colors.main).setDescription('No results found')
                ]
            });

        result.setFooter(`${members.length} results`);
        if (members.length >= 30) {
            const newResult = await client.util.createBin(
                members.map(
                    m =>
                        `${m.user.tag} | ID: ${m.id} | Username: ${m.user.username} | Display Name: \`${m.displayName}\``
                )
            );
            const newResultEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setDescription(
                    `The result may be too large, click to view the result [here](${newResult}) (**${members.length}** results)`
                );
            return interaction.editReply({ embeds: [newResultEmbed] });
        }
        return interaction.editReply({ embeds: [result] });
    }
};
