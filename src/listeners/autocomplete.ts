import Listener from '../lib/structs/Listener';
import { AutocompleteInteraction } from 'discord.js';
import { channelPermissionOverrides } from '../lib/util/constants';

class AutocompleteListener extends Listener {
  constructor() {
    super('autocomplete');
  }

  async run(interaction: AutocompleteInteraction<'cached'>) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'override') return;

    const filtered = channelPermissionOverrides
    .filter(override => override.name.toLowerCase().includes(focused.value.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 25);

    return interaction.respond(filtered).catch(() => {});
  }
}

export default AutocompleteListener;