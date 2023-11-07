import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';
import { hasSlashCommandPermission } from '../lib/util/functions';

class TicketHyperlinkModal extends Modal {
  constructor() {
    super('ticket-hyperlink');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'ticket-manager'))) throw 'Permission revoked.';

    const buttonProperties = interaction.customId.split(':').slice(1);
    const [buttonLabel, buttonColor] = buttonProperties;

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
