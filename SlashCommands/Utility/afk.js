const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'afk',
    description: 'Let people know you are AFK if they try to ping you',
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription("Let people know you're AFK if they try to ping you")
        .addStringOption(option => option.setName('reason').setDescription('The reason for being AFK')),
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, interaction, args) {
        const isAFK = global.afk.some(afk => afk.ID === interaction.author.id);
        if (isAFK) {
            global.afk.pop({ ID: interaction.user.id });
            return interaction.reply(`I removed your AFK status!`);
        }
        const AFKReason = args['reason'];
        if (AFKReason?.length > 200) return interaction.reply('Please make your AFK reason 200 characters or less');
        global.afk.push({ ID: interaction.user.id, reason: AFKReason, at: Date.now() });
        return interaction.reply(`You are now AFK ${AFKReason ? `- ${AFKReason}` : ''}`);
    }
};
