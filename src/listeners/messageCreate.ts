import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';

class MessageCreateListener extends Listener {
  constructor() {
    super('messageCreate');
  }

  async run(message: Message<true>) {
    return this.client.emit('automod', message);
  }
}

export default MessageCreateListener;
