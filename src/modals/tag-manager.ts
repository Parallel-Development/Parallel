import { ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';

class TagManagerModal extends Modal {
  constructor() {
    super('tag-manager');
  }

  async run(interaction: ModalSubmitInteraction) {
    if (!interaction.inCachedGuild()) return;
    const name = interaction.fields.getTextInputValue('name').toLowerCase();
    const content = interaction.fields.getTextInputValue('content');

    const method = interaction.customId.split(':')[1] as 'create' | 'edit';

    if (method === 'create') {
      const worked = await this.client.db.tag
        .create({
          data: {
            guildId: interaction.guildId,
            name,
            content
          }
        })
        .catch(() => { throw 'A tag with that name already exists.'; });

      return interaction.reply(`Created tag \`${name}\`.`);
    } else {
      const worked = await this.client.db.tag
        .update({
          data: {
            content
          },
          where: {
            guildId_name: { guildId: interaction.guildId, name }
          }
        })
        .catch(() => { throw 'Tag does not exist.'; });

      return interaction.reply(`Edited tag \`${name}\`.`);
    }
  }
}

export default TagManagerModal;
