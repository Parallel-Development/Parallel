import { Colors, EmbedBuilder, Message } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { bin } from '../lib/util/functions';

class MessageLogListener extends Listener {
  constructor() {
    super('messageLog');
  }

  async run(oldMessage: Message<true> | null, message: Message<true>) {
    if (!message.author) return;
    if (message.author.bot) return;
    if (!message.guild) return;

    if (oldMessage && oldMessage.content === message.content) return;

    const guild = await this.client.db.guild.findUnique({
      where: {
        id: message.guild.id
      }
    });

    if (!guild?.messageLogWebhookId) return;
    if (guild.messageLogIgnoredChannels.includes(message.channel.id)) return;

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
        name: `Message from ${message.author.username} (${message.author.id}) ${
          oldMessage ? 'edited' : 'deleted'
        } in #${message.channel.name}`,
        iconURL: message.author.displayAvatarURL()
      })
      .setTimestamp();

    if (oldMessage && message.content.length > 0) {
      embed.setDescription(`[Jump to message](${message.url})`).addFields(
        {
          name: 'Old',
          value: oldMessage?.content
            ? oldMessage.content.length > 1000
              ? await bin(oldMessage.content)
              : oldMessage.content
            : '<unknown>'
        },
        {
          name: 'New',
          value: message.content.length > 1000 ? await bin(message.content) : message.content
        }
      );
    } else {
      if (message.content)
        embed.addFields({
          name: 'Content',
          value: message.content.length > 1000 ? await bin(message.content) : message.content
        });

      const url = message.attachments.first()?.url;
      const qMarkIndex = url ? url.indexOf('?') : null;
      if (
        message.attachments.size === 1 &&
        ['png', 'webp', 'jpg', /*j*/ 'peg', 'gif'].includes(url!.slice(0, qMarkIndex!).slice(-3))
      )
        embed.setImage(message.attachments.map(attachment => attachment.url).join('\n'));
      else if (message.attachments.size > 0) {
        embed.addFields({
          name: 'Attachments',
          value: message.attachments
            .map(attachment => {
              const qMarkIndex = attachment.url.lastIndexOf('?');
              const stopAtFileName = attachment.url.slice(0, qMarkIndex);
              return `[${stopAtFileName.slice(stopAtFileName.lastIndexOf('/') + 1)}](${attachment.url})`;
            })
            .join('\n')
        });
      }
    }

    return webhook.send({ embeds: [embed] });
  }
}

export default MessageLogListener;
