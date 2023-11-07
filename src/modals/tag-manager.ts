import { ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';
import { hasSlashCommandPermission } from '../lib/util/functions';

class TagManagerModal extends Modal {
  constructor() {
    super('tag-manager');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'tag-manager'))) throw 'Permission revoked.';

    const name = interaction.fields.getTextInputValue('name').toLowerCase();
    const content = interaction.fields.getTextInputValue('content');

    const method = interaction.customId.split(':')[1] as 'create' | 'edit';

    if (method === 'create') {
      await this.client.db.tag
        .create({
          data: {
            guildId: interaction.guildId,
            name,
            content
          }
        })
        .catch(() => {
          throw 'A tag with that name already exists.';
        });

      return interaction.reply(`Created tag \`${name}\`.`);
    } else {
      await this.client.db.tag
        .update({
          data: {
            content
          },
          where: {
            guildId_name: { guildId: interaction.guildId, name }
          }
        })
        .catch(() => {
          throw 'Tag does not exist.';
        });

      return interaction.reply(`Edited tag \`${name}\`.`);
    }
  }
}

export default TagManagerModal;
