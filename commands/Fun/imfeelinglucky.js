const Discord = require('discord.js')

module.exports = {
    name: 'imfeelinglucky',
    description: 'A 1 out of 500 chance of the bot sending a certain message',
    usage: 'imfeelinglucky',
    aliases: ['ifl', 'lucky', 'googleripoff'],
    async execute(client, message, args) {
        const random = Math.floor(Math.random() * 500)
        if(random == Math.floor(Math.random() * 500)) {
            message.channel.send('JACKPOT! You got very lucky')
        } else {
            message.channel.send('Better luck next time')
        }
    }
}