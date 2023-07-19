import { EmbedBuilder } from '@discordjs/builders';
import { Infraction, InfractionType } from '@prisma/client';
import { Colors } from 'discord.js';
import ms from 'ms';
import Listener from '../lib/structs/Listener';
import { Escalations } from '../types';
import { pastTenseInfractionTypes } from '../lib/util/constants';
import { getMember } from '../lib/util/functions';

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

    let emitAfter: Infraction | null = null;

    if (infraction.type === InfractionType.Warn && infraction.moderatorId !== this.client.user!.id) {
      const infractionCount = await this.client.db.infraction.count({
        where: {
          guildId: guild.id,
          userId: infraction.userId,
          type: InfractionType.Warn,
          moderatorId: { not: this.client.user!.id }
        }
      });
      const escalation = (guild.escalationsManual as Escalations).reduce(
        (prev, curr) =>
          infractionCount >= curr.amount
            ? infractionCount - curr.amount < infractionCount - prev.amount
              ? curr
              : prev
            : prev,
        { amount: 0, punishment: InfractionType.Warn, duration: '0' }
      );

      if (escalation.amount !== 0) {
        const date = BigInt(Date.now());
        const eDuration = BigInt(escalation.duration);
        const eExpires = eDuration ? date + eDuration : null;
        const eExpiresStr = Math.floor(Number(eExpires) / 1000);

        const reason = `Reaching or exceeding ${escalation.amount} infractions.`;

        const eInfraction = await this.client.db.infraction.create({
          data: {
            userId: infraction.userId,
            guildId: infraction.guildId,
            type: escalation.punishment,
            date,
            moderatorId: this.client.user!.id,
            expires: eExpires,
            reason
          }
        });

        if (eExpires) {
          const data = {
            guildId: infraction.guildId,
            userId: infraction.userId,
            type: escalation.punishment,
            expires: eExpires
          };

          await this.client.db.task.upsert({
            where: {
              userId_guildId_type: {
                userId: infraction.userId,
                guildId: infraction.guildId,
                type: escalation.punishment
              }
            },
            update: data,
            create: data
          });
        }

        const eDm = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle(
            `You were ${
              pastTenseInfractionTypes[escalation.punishment.toLowerCase() as keyof typeof pastTenseInfractionTypes]
            } ${
              escalation.punishment === InfractionType.Ban || escalation.punishment === InfractionType.Kick
                ? 'from'
                : 'in'
            } ${this.client.guilds.cache.get(infraction.guildId)!.name}`
          )
          .setColor(
            escalation.punishment === InfractionType.Mute || escalation.punishment === InfractionType.Kick
              ? Colors.Orange
              : escalation.punishment === InfractionType.Unmute || escalation.punishment === InfractionType.Unban
              ? Colors.Green
              : Colors.Red
          )
          .setDescription(
            `${eInfraction.reason}${eExpires ? `\n\n***•** Expires: <t:${eExpiresStr}> (<t:${eExpiresStr}:R>)*` : ''}`
          )
          .setFooter({ text: `Punishment ID: ${infraction.id}` })
          .setTimestamp();

        switch (escalation.punishment) {
          case InfractionType.Ban:
            if (guild.infoBan) eDm.addFields([{ name: 'Additional Information', value: guild.infoBan }]);
          case InfractionType.Kick:
            if (guild.infoKick) eDm.addFields([{ name: 'Additional Information', value: guild.infoKick }]);
          case InfractionType.Mute:
            if (guild.infoMute) eDm.addFields([{ name: 'Additional Information', value: guild.infoMute }]);
          case InfractionType.Warn:
            if (guild.infoWarn) eDm.addFields([{ name: 'Additional Information', value: guild.infoWarn }]);
        }

        const member = await getMember(infraction.guildId, infraction.userId);

        if (member) await member!.send({ embeds: [eDm] });

        emitAfter = eInfraction;

        switch (escalation.punishment) {
          case InfractionType.Ban:
            await member!.ban({ reason });
          case InfractionType.Kick:
            if (member) await member!.kick(reason);
          case InfractionType.Mute:
            if (member) await member!.timeout(Number(eDuration), reason);
        }
      }
    }

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

    await webhook.send({ embeds: [embed] });
    if (emitAfter) this.client.emit('punishLog', emitAfter);
    return;
  }
}

export default PunishLogListener;
