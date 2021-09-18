module.exports = {
    name: 'ping',
    description: 'Returns the client websocket and bot latency',
    aliases: ['pong'],
    usage: 'ping',
    async execute(client, message, args) {
        message.reply('Pinging...')
        .then(result => {
            return result.edit(`Pong! Websocket: \`${client.ws.ping}ms\`, Bot latency: \`${result.createdTimestamp - message.createdTimestamp}ms\``)
        })
    }
}