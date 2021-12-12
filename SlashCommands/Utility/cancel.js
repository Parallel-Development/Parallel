const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const warningSchema = require('../../schemas/warning-schema');

module.exports = {
    name: 'cancel',
    description: 'Cancel a pending for confirmation action',
    data: new SlashCommandBuilder().setName('cancel').setDescription('Cancel a pending for confirmation action'),
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    async execute(client, interaction, args) {
        if (!global.confirmationRequests.some(request => request.ID === interaction.user.id))
            return client.util.throwError(interaction, 'you have no pending confirmation request!');
        if (Date.now() - global.confirmationRequests.find(request => request.ID === interaction.user.id).at > 10000) {
            global.confirmationRequests.pop({ ID: interaction.user.id });
            return client.util.throwError(interaction, 'your confirmation request has already expired');
        }

        global.confirmationRequests.pop({ ID: interaction.user.id });

        const cancelEmbed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(interaction.guild))
            .setAuthor('Action Cancelled!', client.user.displayAvatarURL())
            .setDescription(`✅ Successfully cancelled your pending confirmation request`);

        return interaction.reply({ embeds: [cancelEmbed] });
    }
};
