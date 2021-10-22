const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema');
const restricted = new Set();
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'clear-server-infractions',
    description: 'Remove all server infractions',
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    data: new SlashCommandBuilder().setName('clear-server-infractions').setDescription('Remove all server infractions'),
    async execute(client, interaction, args) {
        if (restricted.has(interaction.guild.id)) return;

        const guildWarnings = await warningSchema.findOne({
            guildID: interaction.guild.id
        });

        if (!guildWarnings || !guildWarnings.warnings.length) return interaction.reply('This server has no warnings');

        if (global.confirmationRequests.some(request => request.ID === interaction.user.id))
            global.confirmationRequests.pop({ ID: interaction.user.id });
        global.confirmationRequests.push({
            ID: interaction.user.id,
            guildID: interaction.guild.id,
            request: 'clearServerInfractions',
            at: Date.now()
        });
        interaction.reply(
            'Are you sure? This will remove all warnings from the server and there is no way to get them back. To confirm, run `/confirm`. To cancel, run `/cancel`'
        );
    }
};
