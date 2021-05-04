const Discord = require('discord.js')

module.exports = {
    name: 'ping',
    description: 'Shows the ping of the bot',
    usage: 'ping',
    aliases: ['pong'],
    async execute(client, message, args) {    
        const msg = await message.channel.send('Pinging...')
        .then(result => {
            const ping = result.createdTimestamp - message.createdTimestamp;
            result.edit(`Pong! Websocket: \`${client.ws.ping}ms\`, Bot latency: \`${ping}ms\``)
        })
    }
}