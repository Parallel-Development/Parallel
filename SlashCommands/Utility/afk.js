const Discord = require('discord.js');
const afkSchema = require('../../schemas/afk-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'afk',
    description: "Let people know you're AFK if they try to ping you",
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription("Let people know you're AFK if they try to ping you")
        .addStringOption(option => option.setName('reason').setDescription('The reason for going AFK')),
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, interaction, args) {
        const afks = await afkSchema.findOne({ guildID: message.guild.id }).then(result => result.afks);
        const isAFK = afks.some(afk => afk.userID === interaction.author.id);
        if (isAFK) {
            await afkSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    $pull: {
                        afks: {
                            userID: interaction.author.id
                        }
                    }
                }
            );
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
        return interaction.reply(`You are now AFK ${AFKReason ? `- ${AFKReason}` : ''}`);
    }
};
