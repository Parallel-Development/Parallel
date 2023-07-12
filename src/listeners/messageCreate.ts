import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';

class MessageCreateListener extends Listener {
  constructor() {
    super('messageCreate');
  }

  async run(message: Message) {
    if (message.inGuild()) this.client.emit('automod', message);
    this.client.emit('messageCommand', message);
  }
}

export default MessageCreateListener;
