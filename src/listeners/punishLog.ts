import { EmbedBuilder } from '@discordjs/builders';
import { Infraction, InfractionType } from '@prisma/client';
import { Colors } from 'discord.js';
import ms from 'ms';
import Listener from '../lib/structs/Listener';

class PunishLog extends Listener {
  constructor() {
    super('punishLog');
  }

  async run(infraction: Infraction) {
    const guild = (await this.client.db.guild.findUnique({
      where: {
        id: infraction.guildId
      }
    }))!;

    if (!guild.logWebhookId) return false;

    const webhook = await this.client.fetchWebhook(guild.logWebhookId!).catch(() => null);
    if (!webhook) {
      await this.client.db.guild.update({
        where: {
          id: guild.id
        },
        data: {
          logWebhookId: null
        }
      });

      return false
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
        `**User:** <@${infraction.userId}> (${infraction.userId})\n**Moderator:** <@${infraction.moderatorId}> (${
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

    return webhook.send({ embeds: [embed] });
  }
}

export default PunishLog;
