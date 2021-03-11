const Discord = require('discord.js')

module.exports = {
    name: 'ping',
    description: 'Shows the ping of the bot',
    usage: 'ping',
    aliases: ['pong'],
    async execute(client, message, args) {    
        const m = await message.channel.send('Ask me if I do this everyday, I said often')
        const currentDate = new Date().getTime()
        m.edit(`Pong! Websocket: \`${client.ws.ping}ms\` | Latency: \`${Date.now() - m.createdTimestamp}ms\``)
    }
}

