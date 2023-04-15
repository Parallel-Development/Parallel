import Listener from '../lib/structs/Listener';
import { ButtonInteraction } from 'discord.js';

class ButtonPressListener extends Listener {
  constructor() {
    super('buttonPress');
  }

  async run(interaction: ButtonInteraction) {
    if (interaction.customId[0] === '?') return;

    const button = this.client.buttons.get(interaction.customId.split(':')[0]);
    if (!button) return interaction.reply({ content: 'Unknown modal interaction.', ephemeral: true });

    try {
      await button.run(interaction)
    } catch (e) {
      if (typeof e !== 'string')
        return console.error(e);

      if (interaction.deferred || interaction.replied)
        return interaction.editReply({ content: e as string });
      else return interaction.reply({ content: e, ephemeral: true });
    }
  }
}

export default ButtonPressListener;
