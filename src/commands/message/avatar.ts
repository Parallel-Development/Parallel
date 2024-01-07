import { Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getUser } from '../../lib/util/functions';

@properties<true>({
  name: 'avatar',
  description: "Get a user's avatar.",
  args: ['[user]'],
  allowDM: true,
  aliases: ['av', 'pfp']
})
class AvatarCommand extends Command {
  async run(message: Message, args: string[]) {
    const user = args.length > 0 ? await getUser(args[0]) : message.author;
    if (!user) throw 'Invalid user.';
    return message.reply(user.displayAvatarURL({ size: 4096 }));
  }
}

export default AvatarCommand;
