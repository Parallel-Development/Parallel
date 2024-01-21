import { Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'membercount',
  description: 'Get the member count of the guild.',
  aliases: ['mc', 'members']
})
class MembercountCommand extends Command {
  async run(message: Message<true>) {
    return message.reply(`There are \`${message.guild.memberCount}\` members in this guild.`);
  }
}

export default MembercountCommand;
