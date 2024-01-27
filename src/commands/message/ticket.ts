import { Message, Collection, EmbedBuilder, TextChannel, PermissionFlagsBits } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import discordTranscripts, { ExportReturnType } from 'discord-html-transcripts';
import crypto from 'crypto';
import { mainColor } from '../../lib/util/constants';

@properties<'message'>({
  name: 'ticket',
  description: 'Create and manage a ticket.',
  args: ['open', 'close', 'share', 'join <code>']
})
class TicketCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing sub command.';
    const subCmd = args[0];

    switch (subCmd) {
      case 'open': {
        throw 'Please run this as a slash command.';
      }
      case 'close': {
        const { allowUserCloseTicket, ticketModeratorRoles, ticketLogWebhookId } =
          (await this.client.db.guild.findUnique({
            where: { id: message.guildId },
            select: { allowUserCloseTicket: true, ticketModeratorRoles: true, ticketLogWebhookId: true }
          }))!;

        const ticket = await this.client.db.ticket.findUnique({
          where: { channelId: message.channelId }
        });

        if (!ticket) throw 'Channel is not a ticket.';

        if (
          !message.member!.permissions.has(PermissionFlagsBits.ManageGuild) &&
          !ticketModeratorRoles.some(r => message.member!.roles.cache.has(r))
        ) {
          if (message.author.id !== ticket.creatorId) throw 'You do not have permission to manage tickets.';

          if (message.author.id === ticket.creatorId && !allowUserCloseTicket)
            throw 'Self ticket closing is not permitted in this server.';
        }

        message.reply('Preparing to close ticket...');

        if (ticketLogWebhookId) {
          const webhook = await this.client.fetchWebhook(ticketLogWebhookId).catch(() => null);
          if (!webhook) {
            await this.client.db.guild.update({
              where: { id: message.guildId },
              data: { ticketLogWebhookId: null }
            });
          } else {
            // fetch up to 300 messages (three dapi calls)
            let before;
            let ticketMessages = new Collection<string, Message<true>>();
            for (let i = 0; i < 3; i++) {
              const messages = await message.channel!.messages.fetch({ limit: 100, before }).then(msgs => {
                if (msgs.size == 0) return false;
                before = msgs.last()!.id;

                ticketMessages = ticketMessages.concat(msgs);
              });

              if (!messages) break;
            }

            const html = await discordTranscripts.generateFromMessages(ticketMessages.reverse(), message.channel!, {
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
                guildId: message.guildId,
                expires: BigInt(Date.now() + 604800000)
              }
            });

            const embed = new EmbedBuilder()
              .setAuthor({ name: 'Ticket Closed', iconURL: this.client.user!.displayAvatarURL() })
              .setTitle(`${ticket.title}`)
              .setColor(mainColor)
              .setDescription(
                `**Created by:** <@${ticket.creatorId}>\n**Closed by:** ${message.author.toString()}\n**Chat log:** ${
                  process.env.API
                }/chatlog/${key.toString('hex')}`
              );

            webhook.send({ embeds: [embed] });
          }
        }

        return message.channel!.delete();
      }
      case 'share': {
        const ticket = await this.client.db.ticket.findUnique({
          where: { channelId: message.channelId }
        });

        if (!ticket) throw 'This channel is not a ticket.';

        const invite = crypto.randomBytes(3).toString('hex');
        await this.client.db.ticket.update({
          where: { channelId: message.channelId },
          data: { invite }
        });

        return message.reply(
          `You created a ticket invite code. The code is ||${invite}||. Please share this with the designated user and have them use the code in \`/ticket join.\` ${
            ticket.invite !== null
              ? 'Note: the previously generated invite no longer works and has been replaced with this one.'
              : ''
          }`
        );
      }
      case 'join': {
        if (args.length < 2) throw 'Missing argument `code`.';
        const code = args[1];
        const ticket = await this.client.db.ticket.findUnique({
          where: { invite: code }
        });

        if (!ticket) throw 'Invalid invite code.';

        const channel = message.guild.channels.cache.get(ticket.channelId) as TextChannel;
        if (channel.permissionsFor(message.member!).has(PermissionFlagsBits.ViewChannel))
          throw 'This user can already view this ticket.';

        await this.client.db.ticket.update({
          where: { invite: code },
          data: { invite: null }
        });

        await channel.permissionOverwrites.create(message.author.id, {
          ViewChannel: true
        });

        return message.reply(`Joined ticket. See <#${ticket.channelId}>.`);
      }
    }
  }
}

export default TicketCommand;
