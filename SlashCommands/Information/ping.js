const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'ping',
    description: 'Returns the client websocket and bot latency',
    data: new SlashCommandBuilder().setName('ping').setDescription('Returns the client websocket and bot latency'),
    async execute(client, interaction, args) {
        await interaction.deferReply();
        const now = performance.now();
        interaction.editReply('Pinging...').then(() => {
            return interaction.editReply(
                `Pong! Websocket: \`${interaction.guild.shard.ping}ms\`, Bot latency: \`${Math.floor(
                    performance.now() - now
                )}ms\``
            );
        });
    }
};
