import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';
import automod from '../handlers/automod';
import messageCommand from '../handlers/messageCommand';

class MessageCreateListener extends Listener {
  constructor() {
    super('messageCreate');
  }

  async run(message: Message) {
    if (message.inGuild()) automod(message);
    messageCommand(message);
  }
}

export default MessageCreateListener;
