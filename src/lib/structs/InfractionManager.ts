import { Infraction, InfractionType } from '@prisma/client';
import client from '../../client';
import { EmbedBuilder } from 'discord.js';
import { infractionColors, pastTenseInfractionTypes } from '../util/constants';
import { getMember, getUser } from '../util/functions';
import ms from 'ms';

export default class InfractionManager {
  async createDM(infraction: Infraction) {
    const guild = await client.db.guild.findUnique({
      where: {
        id: infraction.guildId
      },
      select: { infractionModeratorPublic: true, infoBan: true, infoKick: true, infoMute: true, infoWarn: true }
    });

    const { infoBan, infoKick, infoMute, infoWarn, infractionModeratorPublic } = guild!;
    const tense = pastTenseInfractionTypes[infraction.type.toLowerCase() as keyof typeof pastTenseInfractionTypes];
    const upperTense = tense[0].toUpperCase() + tense.slice(1);
    const moderator = await getUser(infraction.moderatorId);

    const dm = new EmbedBuilder()
      .setColor(infractionColors[infraction.type])
      .setAuthor({ name: `Parallel Moderation`, iconURL: client.user!.displayAvatarURL() })
      .setTitle(
        `You were ${pastTenseInfractionTypes[infraction.type.toLowerCase() as keyof typeof pastTenseInfractionTypes]} ${
          infraction.type === InfractionType.Ban || infraction.type === InfractionType.Kick ? 'from' : 'in'
        } ${client.guilds.cache.get(infraction.guildId)!.name}`
      )
      .setDescription(
        `${infraction.reason}${
          infraction.expires
            ? `\n\n***•** Expires: <t:${Math.floor(Number(infraction.expires) / 1000)}> (<t:${Math.floor(
                Number(infraction.expires) / 1000
              )}:R>).*`
            : ''
        }${
          infractionModeratorPublic
            ? `${infraction.expires ? '\n' : '\n\n'}***•** ${upperTense} by: ${moderator!.toString()} (${
                infraction.moderatorId
              }).*\n`
            : ''
        }`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id}` })
      .setTimestamp(Number(infraction.date));

    switch (infraction.type) {
      case InfractionType.Ban:
        if (infoBan) dm.addFields([{ name: 'Additional Information', value: infoBan }]);
        break;
      case InfractionType.Kick:
        if (infoKick) dm.addFields([{ name: 'Additional Information', value: infoKick }]);
        break;
      case InfractionType.Mute:
        if (infoMute) dm.addFields([{ name: 'Additional Information', value: infoMute }]);
        break;
      case InfractionType.Warn:
        if (infoWarn) dm.addFields([{ name: 'Additional Information', value: infoWarn }]);
        break;
    }

    const member = await getMember(infraction.guildId, infraction.userId);
    if (member) await member.send({ embeds: [dm] }).catch(() => {});
    return;
  }

  async createLog(infraction: Infraction) {
    const guild = await client.db.guild.findUnique({
      where: {
        id: infraction.guildId
      }
    });

    if (!guild?.modLogWebhookId) return false;
    const webhook = await client.fetchWebhook(guild.modLogWebhookId).catch(() => null);

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

    const user = await getUser(infraction.userId);
    const moderator = await getUser(infraction.moderatorId);
    const embed = new EmbedBuilder()
      .setAuthor({ name: `${moderator!.username} (${moderator!.id})`, iconURL: moderator!.displayAvatarURL() })
      .setColor(infractionColors[infraction.type])
      .setDescription(
        `**${
          infraction.type === InfractionType.Ban || infraction.type === InfractionType.Unban ? 'User' : 'Member'
        }:** \`${user!.username}\` (${user!.id})\n**Action:** ${infraction.type.toString()}${
          infraction.expires
            ? `\n**Duration:** ${ms(Number(infraction.expires - infraction.date), {
                long: true
              })}\n**Expires:** <t:${Math.floor(Number(infraction.expires) / 1000)}> (<t:${Math.floor(
                Number(infraction.expires) / 1000
              )}:R>)`
            : ''
        }\n**Reason:** ${infraction.reason}`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id ? infraction.id : 'Undefined'}` })
      .setTimestamp(Number(infraction.date));

    await webhook.send({ embeds: [embed] }).catch(() => {});
    return;
  }
}
