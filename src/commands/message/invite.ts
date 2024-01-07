import { Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';

@properties<true>({
  name: 'invite',
  description: 'Retrieve the invite for Parallel',
  allowDM: true
})
class InviteCommand extends Command {
  async run(message: Message) {
    return message.reply(
      `[Click here](https://discord.com/api/oauth2/authorize?client_id=745401642664460319&permissions=3154439422&scope=bot%20applications.commands) to invite Parallel to your server.`
    );
  }
}

export default InviteCommand;
