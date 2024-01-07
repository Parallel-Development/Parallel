import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';
import messageLog from '../handlers/messageLog';

class MessageDeleteListener extends Listener {
  constructor() {
    super('messageDelete');
  }

  async run(message: Message<true>) {
    messageLog(null, message);
  }
}

export default MessageDeleteListener;
