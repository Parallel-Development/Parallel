import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import Button from '../lib/structs/Button';
import { hasSlashCommandPermission } from '../lib/util/functions';

class CreateTicketButton extends Button {
  constructor() {
    super('create-ticket');
  }

  async run(interaction: ButtonInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'ticket')))
      throw "You don't have permission to use this button.";
    const { ticketsEnabled, ticketLocation, ticketBlacklist } = (await this.client.db.guild.findUnique({
      where: { id: interaction.guildId },
      select: { ticketsEnabled: true, ticketLocation: true, ticketBlacklist: true }
    }))!;

    if (!ticketsEnabled) throw 'Tickets are not enabled in this server.';

    if (!ticketLocation || !interaction.guild.channels.cache.has(ticketLocation))
      throw 'This server has not properly configured tickets.';
    if (ticketBlacklist.includes(interaction.user.id)) throw 'You are blacklisted from opening tickets.';

    const alreadyOpenedTicket = await this.client.db.ticket.findUnique({
      where: { guildId_creatorId: { guildId: interaction.guildId, creatorId: interaction.user.id } }
    });

    if (alreadyOpenedTicket) {
      if (interaction.guild.channels.cache.has(alreadyOpenedTicket.channelId))
        throw `You already have an opened ticket! See <#${alreadyOpenedTicket.channelId}>.`;

      await this.client.db.ticket.delete({
        where: { guildId_creatorId: { guildId: interaction.guildId, creatorId: interaction.user.id } }
      });
    }

    const titleComponent = new TextInputBuilder()
      .setLabel('Title')
      .setCustomId('title')
      .setMaxLength(50)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    const titleRow = new ActionRowBuilder<TextInputBuilder>().addComponents(titleComponent);

    const descriptionComponent = new TextInputBuilder()
      .setLabel('Description')
      .setCustomId('description')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1800)
      .setRequired(true);
    const descriptionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionComponent);

    const modal = new ModalBuilder()
      .setTitle('Ticket')
      .setCustomId('create-ticket')
      .addComponents(titleRow, descriptionRow);

    return interaction.showModal(modal);
  }
}

export default CreateTicketButton;
