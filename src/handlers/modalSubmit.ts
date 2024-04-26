import client from '../client';
import { type ModalSubmitInteraction } from 'discord.js';
import { readComplexCustomId } from '../lib/util/functions';

export default async function (interaction: ModalSubmitInteraction) {
  // if it starts with ? it means it should not be handled here.
  if (interaction.customId[0] === '?') return;

  const name = readComplexCustomId(interaction.customId).name;
  const modal = client.modals.get(name);
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
