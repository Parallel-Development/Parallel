import { PermissionFlagsBits, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
const decancer = require('decancer');
import { commonChars } from '../../lib/util/constants';
import { adequateHierarchy, getMember } from '../../lib/util/functions';

@properties<'message'>({
  name: 'clean-nick',
  description: 'Correct a non-default font, hoisted, or any other unwanted user/nickname.',
  args: '<member> [font | hoist | other]',
  clientPermissions: PermissionFlagsBits.ManageNicknames
})
class CleannickCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `member`.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';

    if (member.id === message.author.id) throw 'You cannot clean your own nickname.';
    if (member.id === this.client.user!.id) throw 'You cannot clean my own nickname.';
    if (!adequateHierarchy(message.member!, member))
      throw "You cannot manage this member's nickname due to inadequate hierarchy.";
    if (!adequateHierarchy(message.guild.members.me!, member))
      throw "You cannot manage this member's nickname due to inadequate hierarchy.";

    const type = args[1] || 'other';
    const name = member.displayName;

    let fixed = '';
    const code = 'XXXX'.replaceAll('X', x => commonChars[Math.floor(Math.random() * commonChars.length)]);

    switch (type) {
      case 'font':
        fixed = decancer(name).toString();
        if (fixed === name) throw 'Nothing changed.';
        break;
      case 'hoist':
        for (let i = 0; i < name.length; i++) {
          if (name.charCodeAt(i) > 64 || +name[i]) break;
          fixed = name.slice(i + 1);
        }

        if (fixed.length === 0) fixed = `Fixed ${code}`;
        break;
      case 'other':
        fixed = `Fixed ${code}`;
        break;
      default:
        throw 'Invalid option.';
    }

    await member.setNickname(fixed);
    return message.reply('Nickname cleaned.');
  }
}

export default CleannickCommand;
