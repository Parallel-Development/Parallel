import { EmbedBuilder } from '@discordjs/builders';
import { Infraction, InfractionType } from '@prisma/client';
import { Colors } from 'discord.js';
import ms from 'ms';
import client from '../client';
import { infractionColors } from '../lib/util/constants';

export default async function (infraction: Infraction) {
  const guild = (await client.db.guild.findUnique({
    where: {
      id: infraction.guildId
    }
  }))!;

  if (!guild.modLogWebhookId) return false;

  const webhook = await client.fetchWebhook(guild.modLogWebhookId!).catch(() => null);
  if (!webhook) {
    await client.db.guild.update({
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
    .setColor(infractionColors[infraction.type])
    .setDescription(
      `**User:** ${(await client.users.fetch(infraction.userId))!.username} (${infraction.userId})\n**Moderator:** ${
        (await client.users.fetch(infraction.moderatorId))!.username
      } (${infraction.moderatorId})${
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
