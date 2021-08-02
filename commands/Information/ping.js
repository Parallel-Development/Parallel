module.exports = {
    name: 'ping',
    description: 'Finds the latency of the bot.',
    aliases: ['pong'],
    async execute(client, message, args) {
        message.channel.send('Pinigng...')
        .then(result => {
            return result.edit(`Pong! Websocket: \`${client.ws.ping}ms\`, Bot latency: \`${result.createdTimestamp - message.createdTimestamp}ms\``)
        })
    }
}