import { Colors, EmbedBuilder, Message } from 'discord.js';
import { bin, webhookSend } from '../lib/util/functions';
import client from '../client';

export default async function (oldMessage: Message<true> | null, message: Message<true>) {
  if (!message.author) return;
  if (message.author.bot) return;
  if (!message.guild) return;

  if (oldMessage && oldMessage.content === message.content) return;

  const guild = await client.db.guild.findUnique({
    where: {
      id: message.guild.id
    }
  });

  if (!guild?.messageLogWebhookURL) return;
  if (guild.messageLogIgnoredChannels.includes(message.channel.id)) return;

  const embed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setAuthor({
      name: `Message from ${message.author.username} (${message.author.id}) ${oldMessage ? 'edited' : 'deleted'} in #${
        message.channel.name
      }`,
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

  try {
    await webhookSend(guild.messageLogWebhookURL, { embeds: [embed] });
  } catch {
    await client.db.guild.update({
      where: {
        id: guild.id
      },
      data: {
        messageLogWebhookURL: null
      }
    });
  }
}
