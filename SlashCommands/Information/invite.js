const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'invite',
    description: 'Sends the invite link of the bot',

    data: new SlashCommandBuilder().setName('invite').setDescription('Sends the invite link of the bot')
    .addBooleanOption(option => option.setName('raw').setDescription('Send the links as plain links, not as buttons')),
    async execute(client, interaction, args) {

        if (args['raw'] === true) {
            return interaction.reply('Parallel invite: <https://discord.com/api/oauth2/authorize?client_id=745401642664460319&permissions=2617568510&scope=bot%20applications.commands>\nDiscord server: <https://discord.gg/v2AV3XtnBM>')
        }

        const botInviteLink = new Discord.MessageButton().setLabel('Parallel Bot Invite').setStyle('LINK').setURL('https://discord.com/api/oauth2/authorize?client_id=745401642664460319&permissions=2617568510&scope=bot%20applications.commands');
        const discordInviteLink = new Discord.MessageButton().setLabel('Parallel Development Discord server invite').setStyle('LINK').setURL('https://discord.gg/v2AV3XtnBM');

        const buttons = new Discord.MessageActionRow().addComponents(
            botInviteLink, discordInviteLink
        )

        return interaction.reply({ content: 'Here you go!', components: [buttons] })
    }
}
