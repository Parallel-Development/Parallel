import autocomplete from '../handlers/autocomplete';
import buttonPress from '../handlers/buttonPress';
import chatInputCommand, { confirmGuild } from '../handlers/chatInputCommand';
import modalSubmit from '../handlers/modalSubmit';
import Listener from '../lib/structs/Listener';
import {
  InteractionType,
  type Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  AutocompleteInteraction
} from 'discord.js';

class InteractionCreateListener extends Listener {
  constructor() {
    super('interactionCreate');
  }

  async run(interaction: Interaction) {
    if (interaction.inCachedGuild()) await confirmGuild(interaction.guildId);
    
    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        return chatInputCommand(interaction as ChatInputCommandInteraction);
      case InteractionType.ModalSubmit:
        return modalSubmit(interaction);
      case InteractionType.MessageComponent:
        return buttonPress(interaction as ButtonInteraction);
      case InteractionType.ApplicationCommandAutocomplete:
        return autocomplete(interaction as AutocompleteInteraction<'cached'>);
    }
  }
}

export default InteractionCreateListener;
