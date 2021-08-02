const Discord = require('discord.js');

module.exports = {
    name: 'coinflip',
    description: 'Flips a coin!',
    usage: 'coinflip',
    aliases: ['flip', 'coin'],
    async execute(client, message, args) {
        const result = ['Heads', 'Tails'][Math.floor(Math.random() * 2)];
        return message.channel.send(result)
    }
}