import { Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'shortcuts',
  description: 'Manage the shortcuts on this guild.',
  slashOnly: true
})
class ShortcutsCommand extends Command {
  async run(message: Message<true>) {
    return message.reply("Due to this command's complex arguments, it is only available via slash commands.");
  }
}

export default ShortcutsCommand;
