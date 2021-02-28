const Discord = require('discord.js')

module.exports = {
    name: 'ping',
    description: 'Shows the ping of the bot',
    usage: 'ping',
    aliases: ['pong'],
    async execute(client, message, args) {    
        const m = await message.channel.send('Pinging...')
        const currentDate = new Date().getTime()
        m.edit(`Pong! Websocket: \`${client.ws.ping}ms\` | Message Latency: \`${Date.now() - message.createdTimestamp}ms\``)
    }
}

