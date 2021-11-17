const Discord = require('discord.js');
const afkSchema = require('../../schemas/afk-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'afk',
    description: "Let people know you're AFK if they try to ping you",
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription("Let people know you're AFK if they try to ping you")
        .addStringOption(option => option.setName('reason').setDescription('The reason for going AFK')),
    async execute(client, interaction, args) {
        const guildAFK = await afkSchema.findOne({ guildID: interaction.guild.id });
        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { modRoles } = guildSettings;
        const { allowedRoles, afks } = guildAFK;

        if (
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !interaction.member.roles.cache.some(role => modRoles.includes(role.id)) &&
            !interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))
        )
            return client.util.throwError(interaction, 'you do not have permission to use the afk command');

        const isAFK = afks.some(afk => afk.userID === interaction.user.id);
        if (isAFK) {
            await afkSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    $pull: {
                        afks: {
                            userID: interaction.user.id
                        }
                    }
                }
            );

            if (interaction.member.displayName.startsWith('[AFK] '))
                await interaction.member.setNickname(`${interaction.member.displayName.slice(5)}`).catch(() => {});

            return interaction.reply(`I removed your AFK status!`);
        }
        const AFKReason = args['reason'];
        if (AFKReason?.length > 200) return interaction.reply('Please make your AFK reason 200 characters or less');
        await afkSchema.updateOne(
            {
                guildID: interaction.guild.id
            },
            {
                $push: {
                    afks: {
                        userID: interaction.user.id,
                        reason: AFKReason,
                        date: Date.now()
                    }
                }
            }
        );

        if (!interaction.member.displayName.startsWith('[AFK] '))
            await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`).catch(() => {});

        return interaction.reply({
            content: `You are now marked as AFK ${AFKReason ? `- ${AFKReason}` : ''}`,
            allowedMentions: { users: [] }
        });
    }
};
