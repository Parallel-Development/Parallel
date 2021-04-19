const Discord = require('discord.js')

module.exports = {
    name: 'ping',
    description: 'Shows the ping of the bot',
    usage: 'ping',
    aliases: ['pong'],
    async execute(client, message, args) {    
        const msg = await message.channel.send('Pinging...')
        msg.edit(`Pong! Websocket: \`${client.ws.ping}ms\` | Latency: \`${new Date().getTime() - msg.createdTimestamp}ms\``)
    }
}