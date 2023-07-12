import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command, { properties, data } from '../../lib/structs/Command';

@data(new SlashCommandBuilder().setName('ping').setDescription("Get the bot's API latency and websocket heartbeat."))
@properties({
  allowDM: true
})
class PingCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    const start = performance.now();
    await interaction.deferReply();
    const end = performance.now();

    const timeTaken = Math.round(end - start);
    const ws = this.client.ws.ping;

    return interaction.editReply(`Pong! Latency: \`${timeTaken}ms\` | WebSocket ping: \`${ws}ms\``);
  }
}

export default PingCommand;
