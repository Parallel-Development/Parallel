import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';
import { hasSlashCommandPermission, readComplexCustomId } from '../lib/util/functions';

class TicketHyperlinkModal extends Modal {
  constructor() {
    super('ticket-hyperlink');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'ticket-manager'))) throw 'Permission revoked.';

    const { data } = readComplexCustomId(interaction.customId);
    if (!data) return;

    const [buttonLabel, buttonColor] = data;

    const description = interaction.fields.getTextInputValue('description');
    const row = new ActionRowBuilder<ButtonBuilder>();
    const button = new ButtonBuilder()
      .setCustomId('create-ticket')
      .setLabel(buttonLabel)
      .setStyle(+buttonColor as ButtonStyle);

    row.addComponents(button);

    await interaction.deferReply({ ephemeral: true });
    await interaction.channel!.send({ content: description, components: [row] });

    return interaction.editReply('Success!');
  }
}

export default TicketHyperlinkModal;
