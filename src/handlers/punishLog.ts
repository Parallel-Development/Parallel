import { EmbedBuilder } from '@discordjs/builders';
import { Infraction } from '@prisma/client';
import ms from 'ms';
import client from '../client';
import { infractionColors } from '../lib/util/constants';
import { webhookSend } from '../lib/util/functions';

export default async function (infraction: Infraction) {
  const guild = (await client.db.guild.findUnique({
    where: {
      id: infraction.guildId
    }
  }))!;

  if (!guild.modLogWebhookURL) return false;

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

  try {
    await webhookSend(guild.modLogWebhookURL, { embeds: [embed] });
  } catch {
    await client.db.guild.update({
      where: {
        id: guild.id
      },
      data: {
        modLogWebhookURL: null
      }
    });
  }
}
