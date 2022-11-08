import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command from '../lib/structs/Command';

class PingCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder().setName('ping').setDescription("Get the bot's API latency and websocket heartbeat.")
    );
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const start = performance.now();
    await interaction.deferReply();
    const end = performance.now();

    const timeTaken = Math.round(end - start);
    const ws = this.client.ws.ping;

    return interaction.editReply(`Pong! Latency: \`${timeTaken}ms\` | WebSocket ping: \`${ws}ms\``);
  }
}

export default PingCommand;
