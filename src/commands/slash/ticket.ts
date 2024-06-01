import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  Message,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  Collection,
  EmbedBuilder,
  TextChannel,
  PermissionFlagsBits
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import discordTranscripts, { ExportReturnType } from 'discord-html-transcripts';
import crypto from 'crypto';
import { mainColor } from '../../lib/util/constants';
import { webhookSend } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create and manage a ticket.')
    .addSubcommand(cmd => cmd.setName('open').setDescription('Open a new ticket in the server.'))
    .addSubcommand(cmd => cmd.setName('close').setDescription('Close the ticket.'))
    .addSubcommand(cmd => cmd.setName('share').setDescription('Create an invite for a user to join the ticket.'))
    .addSubcommand(cmd =>
      cmd
        .setName('join')
        .setDescription('Join a ticket from another user.')
        .addStringOption(opt => opt.setName('code').setDescription('The invite code.').setRequired(true))
    )
)
class TicketCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const subCmd = interaction.options.getSubcommand();

    switch (subCmd) {
      case 'open': {
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
      case 'close': {
        const { allowUserCloseTicket, ticketModeratorRoles, ticketLogWebhookURL } =
          (await this.client.db.guild.findUnique({
            where: { id: interaction.guildId },
            select: { allowUserCloseTicket: true, ticketModeratorRoles: true, ticketLogWebhookURL: true }
          }))!;

        const ticket = await this.client.db.ticket.findUnique({
          where: { channelId: interaction.channelId }
        });

        if (!ticket) throw 'Channel is not a ticket.';

        if (
          !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
          !ticketModeratorRoles.some(r => interaction.member.roles.cache.has(r))
        ) {
          if (interaction.user.id !== ticket.creatorId) throw 'You do not have permission to manage tickets.';

          if (interaction.user.id === ticket.creatorId && !allowUserCloseTicket)
            throw 'Self ticket closing is not permitted in this server.';
        }

        interaction.reply('Preparing to close ticket...');

        if (ticketLogWebhookURL) {
          // fetch up to 300 messages (three dapi calls)

          let before;
          let ticketMessages = new Collection<string, Message<true>>();
          for (let i = 0; i < 3; i++) {
            const messages = await interaction.channel!.messages.fetch({ limit: 100, before }).then(msgs => {
              if (msgs.size == 0) return false;
              before = msgs.last()!.id;
              ticketMessages = ticketMessages.concat(msgs);
            });
            if (!messages) break;
          }

          const html = await discordTranscripts.generateFromMessages(ticketMessages.reverse(), interaction.channel!, {
            poweredBy: false,
            footerText: '',
            returnType: ExportReturnType.Buffer,
            saveImages: false
          });

          // create key hash.
          const key = crypto.randomBytes(16);
          const hash = crypto.createHash('sha256');
          hash.update(key);
          const keyHash = hash.digest();

          // encrypt data with key
          const iv = crypto.randomBytes(4);
          const cipher = crypto.createCipheriv('aes-128-gcm', key, iv);
          const cipherBytes = Buffer.concat([cipher.update(html), cipher.final()]);
          const authTag = cipher.getAuthTag();

          await this.client.db.chatlog.create({
            data: {
              keyHash,
              iv,
              authTag,
              html: cipherBytes,
              guildId: interaction.guildId,
              expires: BigInt(Date.now() + 604800000) // 7 days
            }
          });

          const embed = new EmbedBuilder()
            .setAuthor({ name: 'Ticket Closed', iconURL: this.client.user!.displayAvatarURL() })
            .setTitle(`${ticket.title}`)
            .setColor(mainColor)
            .setDescription(
              `**Created by:** <@${ticket.creatorId}>\n**Closed by:** ${interaction.user.toString()}\n**Chat log:** ${
                process.env.API
              }/chatlog/${key.toString('hex')}`
            );

          try {
            await webhookSend(ticketLogWebhookURL, { embeds: [embed] });
          } catch {
            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { ticketLogWebhookURL: null }
            });
          }
        }

        return interaction.channel!.delete();
      }
      case 'share': {
        const ticket = await this.client.db.ticket.findUnique({
          where: { channelId: interaction.channelId }
        });

        if (!ticket) throw 'This channel is not a ticket.';

        const invite = crypto.randomBytes(3).toString('hex');
        await this.client.db.ticket.update({
          where: { channelId: interaction.channelId },
          data: { invite }
        });

        return interaction.reply(
          `You created a ticket invite code. The code is ||${invite}||. Please share this with the designated user and have them use the code in \`/ticket join.\` ${
            ticket.invite !== null
              ? 'Note: the previously generated invite no longer works and has been replaced with this one.'
              : ''
          }`
        );
      }
      case 'join': {
        const code = interaction.options.getString('code', true);
        const ticket = await this.client.db.ticket.findUnique({
          where: { invite: code }
        });

        if (!ticket) throw 'Invalid invite code.';

        const channel = interaction.guild.channels.cache.get(ticket.channelId) as TextChannel;
        if (channel.permissionsFor(interaction.member).has(PermissionFlagsBits.ViewChannel))
          throw 'This user can already view this ticket.';

        await this.client.db.ticket.update({
          where: { invite: code },
          data: { invite: null }
        });

        await channel.permissionOverwrites.create(interaction.user.id, {
          ViewChannel: true
        });

        return interaction.reply({ content: `Joined ticket. See <#${ticket.channelId}>.`, ephemeral: true });
      }
    }
  }
}

export default TicketCommand;
