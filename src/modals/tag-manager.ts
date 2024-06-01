import { ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';
import { hasSlashCommandPermission, readComplexCustomId } from '../lib/util/functions';

class TagManagerModal extends Modal {
  constructor() {
    super('tag-manager');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'tag-manager'))) throw 'Permission revoked.';

    const content = interaction.fields.getTextInputValue('content');

    const { option, data } = readComplexCustomId(interaction.customId);

    if (option === 'create') {
      const name = interaction.fields.getTextInputValue('name').toLowerCase();

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
      if (!data) return;
      const name = data[0];

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
