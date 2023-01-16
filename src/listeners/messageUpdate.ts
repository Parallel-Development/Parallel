import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';

class MessageUpdateListener extends Listener {
  constructor() {
    super('messageUpdate');
  }

  async run(oldMsg: Message<true>, newMsg: Message<true>) {
    this.client.emit('messageLog', oldMsg, newMsg, 'edit')
    return this.client.emit('automod', newMsg.content)
  }
}

export default MessageUpdateListener;
