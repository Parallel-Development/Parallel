const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'coinflip',
    description: 'Flip a coin!',
    data: new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin!'),
    async execute(client, interaction, args) {
        const result = ['Heads', 'Tails'][Math.floor(Math.random() * 2)];
        return interaction.reply(result);
    }
};
