const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'set-nick',
    description: 'Change the nickname of a user',
    permissions: Discord.Permissions.FLAGS.MANAGE_NICKNAMES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_NICKNAMES,
    data: new SlashCommandBuilder()
        .setName('set-nick')
        .setDescription('Change the nickname of a user')
        .addUserOption(option =>
            option.setName('user').setDescription('The user to change the nickname of').setRequired(true)
        )
        .addStringOption(option => option.setName('nickname').setDescription('The nickname to set the user to')),
    async execute(client, interaction, args) {
        const member = await client.util.getMember(interaction.guild, args['user']);
        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        if (
            member.roles.highest.position >= interaction.member.roles.highest.position &&
            interaction.member.id !== interaction.guild.ownerId &&
            member !== interaction.member
        )
            return client.util.throwError(interaction, client.config.errors.hierarchy);
        if (
            member.roles.highest.position >= interaction.guild.me.roles.highest.position &&
            member !== interaction.guild.me
        )
            return client.util.throwError(interaction, client.config.errors.my_hierarchy);
        if (interaction.guild.ownerId === member.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_owner);

        const nickname = args['nickname'] || null;
        if (member.nickname === nickname && nickname === null)
            return client.util.throwError(interaction, 'Please provide a nickname as this user has none!');
        if (member.displayName === nickname)
            return client.util.throwError(interaction, 'This user already has this nickname!');
        if (nickname?.length > 32) return client.util.throwError(interaction, 'Nickname length must be 32 or less');
        await member.setNickname(nickname);

        const successEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`✅ Nickname for ${member} set ${nickname ? `to \`${nickname}\`` : 'back to normal'}`);
        return interaction.reply({ embeds: [successEmbed] });
    }
};
