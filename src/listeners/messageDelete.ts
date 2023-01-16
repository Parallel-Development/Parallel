import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';

class MessageDeleteListener extends Listener {
  constructor() {
    super('messageDelete');
  }

  async run(message: Message<true>) {
    return this.client.emit('messageLog', null, message, 'delete');
  }
}

export default MessageDeleteListener;
