const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'userinfo',
    description: 'Shows informated of a user',
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Shows informated of a user')
        .addUserOption(option => option.setName('user').setDescription('The user to get information on')),
    async execute(client, interaction, args) {
        const member =
            (await client.util.getMember(interaction.guild, args['user'])) ||
            (await client.util.getUser(client, args['user'])) ||
            interaction.member;

        const user = member.user ? member.user : member;

        const userinfo = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(interaction.guild))
            .setDescription(
                `User information for ${member} ${
                    member.user && member.user.username !== member.displayName ? `(${member.user.username})` : ''
                }`
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addField('User Tag', user.tag, true)
            .addField('User ID', user.id, true)
            .addField('Bot Account?', user.bot ? 'Yes' : 'No', false)
            .addField(
                'Created',
                `${client.util.timestamp(user.createdAt)} -> ${client.util.duration(
                    Math.round(Date.now() - user.createdAt)
                )} ago`
            )
            .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL());
        if (member instanceof Discord.GuildMember) {
            const memberRoles = [...member.roles.cache.values()]
                .sort((a, b) => b.position - a.position)
                .slice(0, -1)
                .join(', ');
            userinfo.addField(
                'Joined',
                `${client.util.timestamp(member.joinedAt)} -> ${client.util.duration(Date.now() - member.joinedAt)} ago`
            );
            userinfo.addField(
                `Roles [${member.roles.cache.size - 1}]`,
                !(member.roles.cache.size - 1)
                    ? 'No Roles'
                    : memberRoles.length <= 1024
                    ? memberRoles
                    : [...member.roles.cache.values()]
                          .sort((a, b) => b.position - a.position)
                          .slice(0, 10)
                          .join(', '),
                false
            );
        }

        return interaction.reply({ embeds: [userinfo] });
    }
};
