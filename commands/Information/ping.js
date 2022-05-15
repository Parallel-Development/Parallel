module.exports = {
    name: 'ping',
    description: 'Returns the client websocket and bot latency',
    aliases: ['pong'],
    usage: 'ping',
    async execute(client, message, args) {
        const now = performance.now();
        const msg = await message.reply('Pinging...');
        return msg.edit(
            `Pong! Websocket: \`${message.guild.shard.ping}ms\`, Bot latency: \`${Math.round(
                performance.now() - now
            )}ms\``
        );
    }
};
