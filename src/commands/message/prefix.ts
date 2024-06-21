import { type Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'prefix',
  description: 'Change the prefix used to identify Parallel commands.'
})
class PrefixCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const prefix = args[0];
    if (!prefix) throw 'Missing required argument `prefix`.';

    if (prefix.length > 10) throw 'The prefix may not be longer than 10 characters.';

    await this.client.db.guild.update({
      where: { id: message.guildId },
      data: {
        prefix
      }
    });

    return message.reply(`The prefix is now set to \`${prefix}\``);
  }
}

export default PrefixCommand;
