import Listener from '../lib/structs/Listener';
import { type Interaction } from 'discord.js';

class InteractionCreateListener extends Listener {
  constructor() {
    super('interactionCreate');
  }

  async run(interaction: Interaction) {
    if (interaction.isChatInputCommand()) return this.client.emit('chatInputCommand', interaction);
    else if (interaction.isModalSubmit()) return this.client.emit('modalSubmit', interaction);
  }
}

export default InteractionCreateListener;
