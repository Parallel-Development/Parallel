const Discord = require('discord.js');

module.exports = {
    name: 'coinflip',
    description: 'Flips a coin!',
    usage: 'coinflip',
    aliases: ['flip', 'coin'],
    async execute(client, message, args) {
        const flip = ['Heads', 'Tails']

        const result = flip[Math.floor(Math.random() * flip.length)];

        const resultEmbed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Coin was flipped! It landed on... ${result}`)
            .setAuthor('Coinflip', client.user.displayAvatarURL())

        message.channel.send(resultEmbed)
    }
}