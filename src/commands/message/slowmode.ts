import { PermissionFlagsBits, Message } from 'discord.js';
import ms from 'ms';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'slowmode',
  description: 'Modify the slowmode in a channel',
  args: ['[set | add | remove] <slowmode>'],
  aliases: ['sm']
})
class SlowmodeCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `slowmode`.';

    if (!message.channel?.isTextBased()) throw "You can't set the slowmode in this channel.";
    if (!message.channel.permissionsFor(message.guild.members.me!).has(PermissionFlagsBits.ManageChannels))
      throw 'I do not have permission to change the slowmode in this channel.';

    const method = args[0];
    if (['add', 'remove', 'set'].includes(method)) args.shift();

    if (args.length === 0) throw 'Missing required argument `slowmode`.';

    const slowmodeStr = args[0];
    let slowmode = +slowmodeStr || Math.floor(ms(slowmodeStr) / 1000);
    if (Number.isNaN(slowmode)) throw 'Invalid slowmode.';

    switch (method) {
      case 'add':
        slowmode += message.channel.rateLimitPerUser ?? 0;
        break;
      case 'remove':
        slowmode = (message.channel.rateLimitPerUser ?? 0) - slowmode;
        break;
    }

    if (slowmode !== 0 && slowmode < 1) throw 'Slowmode must be at least 1 second or 0.';
    if (slowmode > 21600) throw 'Slowmode cannot be greater than 6 hours.';

    await message.channel.setRateLimitPerUser(slowmode);
    if (slowmode === 0) return message.reply('Slowmode disabled.');
    return message.reply(`Slowmode set to \`${ms(slowmode * 1000, { long: true })}\`.`);
  }
}

export default SlowmodeCommand;
