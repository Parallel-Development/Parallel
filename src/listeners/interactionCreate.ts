import Listener from '../lib/structs/Listener';
import { InteractionType, type Interaction } from 'discord.js';

class InteractionCreateListener extends Listener {
  constructor() {
    super('interactionCreate');
  }

  async run(interaction: Interaction) {
    switch (interaction.type) {
      case InteractionType.ApplicationCommand: return this.client.emit('chatInputCommand', interaction);
      case InteractionType.ModalSubmit: return this.client.emit('modalSubmit', interaction);
      case InteractionType.MessageComponent: return this.client.emit('buttonPress', interaction);
      case InteractionType.ApplicationCommandAutocomplete: return this.client.emit('autocomplete', interaction);
    }
  }
}

export default InteractionCreateListener;
