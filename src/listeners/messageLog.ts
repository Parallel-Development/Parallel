import { Colors, EmbedBuilder, Message } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { bin } from '../lib/util/functions';

class MessageLogListener extends Listener {
  constructor() {
    super('messageLog');
  }

  async run(oldMessage: Message<true> | null, message: Message<true>, type: 'edit' | 'delete') {
    if (!message.author) return;
    if (message.author.bot) return;

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
          type === 'edit' ? 'edited' : 'deleted'
        }`,
        iconURL: message.author.displayAvatarURL()
      })
      .setTimestamp();

    if (type === 'edit' && message.content.length > 0) {
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

      if (
        message.attachments.size === 1 &&
        ['png', 'webp', 'jpg', 'jpeg', 'gif'].includes(message.attachments.first()!.url.slice(-3))
      )
        embed.setImage(message.attachments.map(attachment => attachment.url).join('\n'));
      else if (message.attachments.size > 0)
        embed.addFields({
          name: 'Attachments',
          value: message.attachments.map(attachment => attachment.url).join('\n')
        });
    }

    return webhook.send({ embeds: [embed] });
  }
}

export default MessageLogListener;
