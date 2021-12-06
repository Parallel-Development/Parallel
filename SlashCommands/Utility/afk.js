const Discord = require('discord.js');
const afkSchema = require('../../schemas/afk-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');
const settingsSchema = require('../../schemas/settings-schema');
const automodSchema = require('../../schemas/automod-schema');
const AutomodChecks = require('../../structures/AutomodChecks');

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

        let wasDefered = false;

        if (
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !interaction.member.roles.cache.some(role => modRoles.includes(role.id)) &&
            args['reason']
        ) {
            await interaction.deferReply();
            wasDefered = true;
            const message = interaction.channel.messages.cache.find(m => m.interaction?.id === interaction.id);
            message.content = args['reason'];

            const punished = await new AutomodChecks(client, message, false).execute(true);
            if (punished) {
                await message.delete();
                return interaction.user
                    .send(
                        'Command rejected because the AFK reason included content that would have gotten you punished by the auto-moderation!'
                    )
                    .catch(() => {});
            }
        }

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

            return wasDefered
                ? interaction.editReply(`I removed your AFK status!`)
                : interaction.reply(`I removed your AFK status!`);
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

        return wasDefered
            ? interaction.editReply({
                  content: `You are now marked as AFK ${AFKReason ? `- ${AFKReason}` : ''}`,
                  allowedMentions: { users: [] }
              })
            : interaction.reply({
                  content: `You are now marked as AFK ${AFKReason ? `- ${AFKReason}` : ''}`,
                  allowedMentions: { users: [] }
              });
    }
};
