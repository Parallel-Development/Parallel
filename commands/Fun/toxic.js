const Discord = require('discord.js')

module.exports = {
    name: 'toxic',
    description: 'no',
    usage: 'toxic',
    async execute(client, message, args) {
        if (message.author.id !== '416798214415450112') return message.channel.send('ok')
        else if (message.author.id == '727421332916273223') return message.channel.send('OMG HI TOXIC')
        message.channel.send('LMAO simp')
    }
}