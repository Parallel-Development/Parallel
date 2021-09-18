const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'docs',
    description: 'Send a link to Parallel\'s documentation',
    data: new SlashCommandBuilder().setName('docs').setDescription('Send a link to Parallel\'s documentation'),
    async execute(client, interaction, args) {
        return interaction.reply('Parallel\'s official documentation is found at this page: https://piyeris0.gitbook.io/parallel/')
    }
}