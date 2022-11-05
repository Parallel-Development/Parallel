import Listener from "../lib/structs/Listener";
import client from "../client";
import { type ModalSubmitInteraction } from "discord.js";

class ModalSubmitCommandListener extends Listener {
  constructor() {
    super('modalSubmit');
  }

  async run(interaction: ModalSubmitInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Not sure how this happened...', ephemeral: true });

    const modal = client.modals.get(interaction.customId.split(':')?.[1]);
    if (!modal) return interaction.reply({ content: 'Unknown modal interaction.', ephemeral: true });

    try {
      await modal.run(interaction);
    } catch (e) {
      if (typeof e !== 'string') {
        console.error(e);
        return;
      }

      if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: e, ephemeral: true })
      else return interaction.editReply({ content: e as string });
    }
  }
}

export default ModalSubmitCommandListener;