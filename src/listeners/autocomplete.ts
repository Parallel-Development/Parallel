import Listener from '../lib/structs/Listener';
import { AutoModerationRuleTriggerType, AutocompleteInteraction } from 'discord.js';
import { channelPermissionOverrides } from '../lib/util/constants';

class AutocompleteListener extends Listener {
  constructor() {
    super('autocomplete');
  }

  async run(interaction: AutocompleteInteraction<'cached'>) {
    const focused = interaction.options.getFocused(true);
    const focusedLowercase = focused.value.toLowerCase();

    switch (focused.name) {
      case 'override': {
        const filtered = channelPermissionOverrides
        .filter(override => override.name.toLowerCase().includes(focusedLowercase))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 25);

        return interaction.respond(filtered).catch(() => {});
      }
      case 'rule': {
        const rules = await interaction.guild.autoModerationRules.fetch();
        const filtered = [
          ...rules
          .filter(rule => rule.triggerType === AutoModerationRuleTriggerType.Keyword && rule.name.toLowerCase().includes(focusedLowercase))
          .sort((a, b) => a.name.localeCompare(b.name))
          .values()
        ]
        .slice(0, 24)
        .map(rule => { return { name: rule.name, value: rule.id }})

        return interaction.respond([{ name: 'Create For Me', value: 'create' }].concat(filtered)).catch(() => {});
      }
    }
  }
}

export default AutocompleteListener;