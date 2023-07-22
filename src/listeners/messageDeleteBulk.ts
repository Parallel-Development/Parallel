import { Collection, Colors, EmbedBuilder, Message, PartialMessage } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { bin } from '../lib/util/functions';

class MessageDeleteBulkListener extends Listener {
  constructor() {
    super('messageDeleteBulk');
  }

  async run(messages: Collection<string, Message<true>>) {
    if (messages.size === 0) return false;
    messages = messages.filter(msg => msg instanceof Message);
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
    let prev = messagesArr.at(-1)!;
    let description = `${prev.member!.displayName} (${prev.author.username} | ${prev.author.id}):\n> ${prev.content}`;

    for (let i = messagesArr.length - 2; i >= 0; i--) {
      const message = messagesArr[i];

      if (prev.author.id === message.author.id) description += `\n> ${message.content}`;
      else description += `${message.member!.displayName} (${message.author.username} | ${message.author.id}):\n> ${message.content}`;
    }

    if (description.length > 3500) description = await bin(description);
    embed.setDescription(description);

    return webhook.send({ embeds: [embed] });
  }
}

export default MessageDeleteBulkListener;
