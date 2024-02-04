import { type Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'ping',
  description: "Get the bot's API latency and websocket heartbeat.",
  allowDM: true,
  aliases: ['pong', 'latency']
})
class PingCommand extends Command {
  async run(message: Message) {
    const start = performance.now();
    const msg = await message.reply('Pinging...');
    const end = performance.now();

    const timeTaken = Math.round(end - start);
    const ws = this.client.ws.ping;

    return msg.edit(`Pong! Roundtrip: \`${timeTaken}ms\` | Latency: \`${ws}ms\``);
  }
}

export default PingCommand;
