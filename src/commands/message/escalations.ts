import { Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';

@properties<true>({
  name: 'escalations',
  description: 'Escalations allow you to punish members for reaching an amount of warnings.',
  NA: true
})
class EscalationsCommand extends Command {
  async run(message: Message<true>) {
    return message.reply("Due to this command's complex arguments, it is only available via slash commands.");
  }
}

export default EscalationsCommand;
