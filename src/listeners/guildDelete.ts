import { Guild } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { customCommandsConfirmed } from '../handlers/chatInputCommand';

class GuildDeleteListener extends Listener {
  constructor() {
    super('guildDelete');
  }

  async run(guild: Guild) {
    customCommandsConfirmed.delete(guild.id);
  }
}

export default GuildDeleteListener;
