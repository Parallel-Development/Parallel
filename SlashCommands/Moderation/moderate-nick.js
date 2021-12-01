const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'moderate-nick',
    description:
        'Set the nickname of a user to Moderated_(Random Code) - Useful for filtering out names blacklisted on a server',
    data: new SlashCommandBuilder()
        .setName('moderate-nick')
        .setDescription('Set the nickname of a user to Moderated_(Random Code)')
        .addUserOption(option => option.setName('member').setDescription('The member to moderate').setRequired(true))
        .addBooleanOption(option => option.setName('dm').setDescription('DM the user regarding their nickname change'))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The message sent to the user regarding their nickname change if you are to DM them')
        ),
    permissions: Discord.Permissions.FLAGS.MANAGE_NICKNAMES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_NICKNAMES,
    async execute(client, interaction, args) {
        if (args['reason'] && !args['dm'])
            return client.util.throwError(interaction, client.config.errors.reason_but_no_dm);

        const member = await client.util.getMember(interaction.guild, args['member']);
        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        if (member.id === client.user.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_myself);
        if (member.id === interaction.member.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_yourself);
        if (
            member.roles.highest.position >= interaction.member.roles.highest.position &&
            interaction.member.id !== interaction.guild.ownerId
        )
            return client.util.throwError(interaction, client.config.errors.hierarchy);
        if (member.roles.highest.position >= interaction.guild.me.roles.highest.position)
            return client.util.throwError(interaction, client.config.errors.my_hierarchy);

        let code = '';
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i !== 8; ++i) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }

        await member.setNickname(`Moderated_${code}`);

        let failedToSend = false;
        if (args['dm'] === true) {
            let reason = args['reason'] || 'Unspecified';
            if (reason.length >= 1024) reason = await client.util.createBin(reason);
            await member
                .send(
                    `Your username was moderated in **${interaction.guild.name}** ${
                        reason ? '| Reason: ' + reason : ''
                    }`
                )
                .catch(() => (failedtoSend = true));
        }

        const moderatedNicknameEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(interaction.guild))
            .setDescription(
                `✅ User with ID \`${member.id}\` has been moderated with identifier code \`${code}\` ${
                    args['dm'] ? (failedToSend ? '| Failed to DM them' : "| Successfully DM'd them") : ''
                }`
            );

        await interaction.reply({ embeds: [moderatedNicknameEmbed] });

        return;
    }
};
