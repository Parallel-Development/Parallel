import { Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getUser } from '../../lib/util/functions';

@properties<true>({
  name: 'remove-all-infractions',
  description: 'Remove all infractions from a user.',
  args: ['[user]']
})
class RemoveAllInfractions extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `user`.';

    const user = await getUser(args[0]);
    if (!user) throw 'Invalid user.';

    const count = (
      await this.client.db.infraction.deleteMany({
        where: {
          userId: user.id,
          guildId: message.guildId
        }
      })
    ).count;

    if (count === 0) throw `**${user.username}** has no infractions in this guild.`;

    return message.reply(`Removed all infractions from **${user.username}**`);
  }
}

export default RemoveAllInfractions;
