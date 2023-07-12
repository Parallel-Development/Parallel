import { Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getUser } from '../../lib/util/functions';

@properties<true>({
  name: 'tag',
  description: 'Reference text',
  args: ['[name] <target>']
})
class TagCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `name`.';

    const target = await getUser(args.at(-1) as string);
    if (target) args.splice(-1, 1);

    if (args.length === 0) throw 'Missing required argument `name`.';

    const name = args.join(' ');

    const tag = await this.client.db.tag.findUnique({
      where: {
        guildId_name: { guildId: message.guildId, name }
      }
    });

    if (!tag) throw `Tag does not exist.`;

    return message.reply({
      content: `${target ? `*Tag suggestion for ${target.toString()}*\n` : ''}${tag.content}`,
      allowedMentions: { parse: ['users'] }
    });
  }
}

export default TagCommand;
