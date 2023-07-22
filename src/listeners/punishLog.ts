import { EmbedBuilder } from '@discordjs/builders';
import { Infraction, InfractionType } from '@prisma/client';
import { Colors } from 'discord.js';
import ms from 'ms';
import Listener from '../lib/structs/Listener';

class PunishLogListener extends Listener {
  constructor() {
    super('punishLog');
  }

  async run(infraction: Infraction) {
    const guild = (await this.client.db.guild.findUnique({
      where: {
        id: infraction.guildId
      }
    }))!;

    if (!guild.modLogWebhookId) return false;

    const webhook = await this.client.fetchWebhook(guild.modLogWebhookId!).catch(() => null);
    if (!webhook) {
      await this.client.db.guild.update({
        where: {
          id: guild.id
        },
        data: {
          modLogWebhookId: null
        }
      });

      return false;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${infraction.id ? `Case ${infraction.id} | ` : ''}${infraction.type.toString()}`)
      .setColor(
        infraction.type === InfractionType.Warn
          ? Colors.Yellow
          : infraction.type === InfractionType.Mute || infraction.type === InfractionType.Kick
          ? Colors.Orange
          : infraction.type === InfractionType.Unmute || infraction.type === InfractionType.Unban
          ? Colors.Green
          : Colors.Red
      )
      .setDescription(
        `**User:** ${(await this.client.users.fetch(infraction.userId))!.username} (${infraction.userId})\n**Moderator:** ${(await this.client.users.fetch(infraction.moderatorId))!.username} (${
          infraction.moderatorId
        })${
          infraction.expires
            ? `\n**Duration:** ${ms(Number(infraction.expires - infraction.date), {
                long: true
              })}\n**Expires:** <t:${Math.floor(Number(infraction.expires) / 1000)}> (<t:${Math.floor(
                Number(infraction.expires) / 1000
              )}:R>)`
            : ''
        }\n**Reason:** ${infraction.reason}`
      )
      .setTimestamp();

    await webhook.send({ embeds: [embed] });
    return;
  }
}

export default PunishLogListener;
