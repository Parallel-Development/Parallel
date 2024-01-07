import client from '../client';
import { type ModalSubmitInteraction } from 'discord.js';

export default async function (interaction: ModalSubmitInteraction) {
  if (interaction.customId[0] === '?') return;

  const modal = client.modals.get(interaction.customId.split(':')[0]);
  if (!modal) return interaction.reply({ content: 'Unknown modal interaction.', ephemeral: true });

  try {
    await modal.run(interaction);
  } catch (e) {
    if (typeof e !== 'string') {
      console.error(e);
      return;
    }

    if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: e, ephemeral: true });
    else return interaction.editReply({ content: e as string });
  }
}
