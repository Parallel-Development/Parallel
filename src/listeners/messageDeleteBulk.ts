import { Collection, Colors, EmbedBuilder, Message, PartialMessage } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { bin } from '../lib/util/functions';

class MessageDeleteBulkListener extends Listener {
  constructor() {
    super('messageDeleteBulk');
  }

  async run(messages: Collection<string, Message<true>>) {
    messages = messages.filter(msg => msg instanceof Message && msg.content?.length > 0);
    if (messages.size === 0) return false;

    const refMsg = messages.first()!;

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

    const messagesArr = [...messages.values()];
    const firstMsg = messagesArr.at(-1)!;
    let prevUser = firstMsg.author.id;

    let description = `${firstMsg.author.username} (${firstMsg.author.id}):\n> ${firstMsg.content}`;

    for (let i = messagesArr.length - 2; i >= 0; i--) {
      const message = messagesArr[i];

      if (prevUser === message.author.id) description += `\n> ${message.content}`;
      else description += `\n${message.author.username} (${message.author.id}):\n> ${message.content}`;
      
      prevUser = message.author.id;
    }

    if (description.length > 3500) description = await bin(description);
    embed.setDescription(description);

    return webhook.send({ embeds: [embed] });
  }
}

export default MessageDeleteBulkListener;
