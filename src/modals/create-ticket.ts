import { ChannelType, ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';
import { hasSlashCommandPermission } from '../lib/util/functions';

class CreateTicketModal extends Modal {
  constructor() {
    super('create-ticket');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'ticket'))) throw 'Permission revoked.';

    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');

    const { ticketsEnabled, ticketLocation, ticketBlacklist, pingRoleOnTicketCreation } =
      (await this.client.db.guild.findUnique({
        where: { id: interaction.guildId },
        select: { ticketsEnabled: true, ticketLocation: true, ticketBlacklist: true, pingRoleOnTicketCreation: true }
      }))!;

    if (!ticketsEnabled) throw 'Tickets are not enabled in this server.';

    if (!ticketLocation || !interaction.guild.channels.cache.has(ticketLocation))
      throw 'This server has not properly configured tickets.';
    if (ticketBlacklist.includes(interaction.user.id)) throw 'You are blacklisted from opening tickets.';

    await interaction.deferReply({ ephemeral: true });

    const channel = await interaction.guild.channels
      .create({
        name: title,
        parent: ticketLocation,
        type: ChannelType.GuildText,
        reason: 'Ticket created.',
        position: 0
      })
      .catch(() => null);

    if (!channel) throw 'Failed to create channel due to missing permissions.';

    await this.client.db.ticket.create({
      data: {
        channelId: channel.id,
        title,
        creatorId: interaction.user.id,
        guildId: interaction.guildId
      }
    });

    const pingRole = pingRoleOnTicketCreation ? interaction.guild.roles.cache.get(pingRoleOnTicketCreation) : null;
    if (pingRoleOnTicketCreation && !pingRole) {
      await this.client.db.guild.update({
        where: { id: interaction.guildId },
        data: { pingRoleOnTicketCreation: null }
      });
    }

    await channel.send({
      content: `${
        pingRole ? pingRole.toString() : ''
      }\nTicket created by ${interaction.user.toString()}\n\n# ${title}\n${description}`,
      allowedMentions: pingRole ? { roles: [pingRole.id] } : {}
    });

    await channel.permissionOverwrites.create(interaction.user.id, {
      ViewChannel: true
    });

    return interaction.editReply(`Ticket created! See ${channel.toString()}.`);
  }
}

export default CreateTicketModal;
