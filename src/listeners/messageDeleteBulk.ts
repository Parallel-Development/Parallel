import { Collection, Colors, EmbedBuilder, Message, PartialMessage } from 'discord.js';
import Listener from '../lib/structs/Listener';
import discordTranscripts, { ExportReturnType } from 'discord-html-transcripts';
import crypto from 'crypto';
import { bin } from '../lib/util/functions';

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

    if (!guild?.messageLogWebhookId) return;
    if (guild.messageLogIgnoredChannels.includes(refMsg.channel.id)) return;

    const webhook = await this.client.fetchWebhook(guild.messageLogWebhookId!).catch(() => null);
    if (!webhook) {
      await this.client.db.guild.update({
        where: {
          id: guild.id
        },
        data: {
          messageLogWebhookId: null
        }
      });

      return false;
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Orange)
      .setAuthor({
        name: `Messages bulk deleted in #${refMsg.channel.name}`,
        iconURL: this.client.user!.displayAvatarURL()
      })
      .setTimestamp();

    if (messages.size === 0) return webhook.send({ embeds: [embed] });

    const html = await discordTranscripts.generateFromMessages(messages.reverse(), refMsg.channel, {
      poweredBy: false,
      footerText: '',
      returnType: ExportReturnType.String,
      saveImages: false
    });

    const chatlog = await this.client.db.chatlog.create({
      data: {
        id: crypto.randomBytes(4).toString('hex'),
        guildId: refMsg.guildId,
        expires: BigInt(Date.now() + 604800000),
        html
      }
    });
    
    embed.setDescription(
      `[View chat log](${process.env.API}/chatlog/${chatlog.id})\nAll chat logs are automatically deleted after one week.`
    );

    return webhook.send({ embeds: [embed] });
  }
}

export default MessageDeleteBulkListener;
