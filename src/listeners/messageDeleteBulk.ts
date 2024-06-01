import { Collection, Colors, EmbedBuilder, Message, PartialMessage } from 'discord.js';
import Listener from '../lib/structs/Listener';
import discordTranscripts, { ExportReturnType } from 'discord-html-transcripts';
import crypto from 'crypto';
import { webhookSend } from '../lib/util/functions';

class MessageDeleteBulkListener extends Listener {
  constructor() {
    super('messageDeleteBulk');
  }

  async run(messages: Collection<string, Message<true>>) {
    const refMsg = messages.first()!;

    messages = messages.filter(msg => msg.author !== null);

    const guild = await this.client.db.guild.findUnique({
      where: {
        id: refMsg.guild.id
      }
    });

    if (!guild?.messageLogWebhookURL) return;
    if (guild.messageLogIgnoredChannels.includes(refMsg.channel.id)) return;

    const embed = new EmbedBuilder()
      .setColor(Colors.Orange)
      .setAuthor({
        name: `Messages bulk deleted in #${refMsg.channel.name}`,
        iconURL: this.client.user!.displayAvatarURL()
      })
      .setTimestamp();

    if (messages.size === 0) {
      try {
        await webhookSend(guild.messageLogWebhookURL, { embeds: [embed] });
      } catch {
        await this.client.db.guild.update({
          where: {
            id: guild.id
          },
          data: {
            messageLogWebhookURL: null
          }
        });

        return;
      }
    }
    //return webhook.send({ embeds: [embed] });

    const html = await discordTranscripts.generateFromMessages(messages.reverse(), refMsg.channel, {
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
        guildId: refMsg.guildId,
        expires: BigInt(Date.now() + 604800000)
      }
    });

    embed.setDescription(`[View chat log](${process.env.API}/chatlog/${key.toString('hex')})`);

    try {
      await webhookSend(guild.messageLogWebhookURL, { embeds: [embed] });
    } catch {
      await this.client.db.guild.update({
        where: {
          id: guild.id
        },
        data: {
          messageLogWebhookURL: null
        }
      });

      return;
    }
  }
}

export default MessageDeleteBulkListener;
