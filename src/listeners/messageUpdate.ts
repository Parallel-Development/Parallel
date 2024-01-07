import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';
import messageLog from '../handlers/messageLog';
import automod from '../handlers/automod';

class MessageUpdateListener extends Listener {
  constructor() {
    super('messageUpdate');
  }

  async run(oldMsg: Message<true>, newMsg: Message<true>) {
    messageLog(oldMsg, newMsg);
    automod(newMsg);
  }
}

export default MessageUpdateListener;
