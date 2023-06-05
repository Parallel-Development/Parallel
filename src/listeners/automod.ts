import { InfractionType } from '@prisma/client';
import { Colors, EmbedBuilder, Message, PermissionFlagsBits as Permissions } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { domainReg, pastTenseInfractionTypes } from '../lib/util/constants';
import { AutoModSpamTriggers, Escalations } from '../types';

class AutomodListener extends Listener {
  // userId.guildId
  spamTrack: Map<string, number[]> = new Map();

  constructor() {
    super('automod');
  }

  async run(message: Message<true>) {
    if (!message.member) return;

    const automod = await this.client.db.guild.findUnique({
      where: {
        id: message.guildId
      },
      select: {
        autoModSpamToggle: true,
        autoModSpamTriggers: true,
        autoModSpamImmuneChannels: true,
        autoModSpamImmuneRoles: true,
        autoModSpamPunishment: true,
        autoModSpamDuration: true,
        autoModMaliciousToggle: true,
        autoModMaliciousImmuneChannels: true,
        autoModMaliciousImmuneRoles: true,
        autoModMaliciousPunishment: true,
        autoModMaliciousDuration: true,

        infoWarn: true,
        infoMute: true,
        infoKick: true,
        infoBan: true,

        escalations: true
      }
    });

    if (!automod) return;
    if (message.member.permissions.has(Permissions.Administrator)) return;

    if (
      automod.autoModMaliciousToggle &&
      !automod.autoModMaliciousImmuneChannels.includes(message.channelId) &&
      !message.member!.roles.cache.some(role => automod.autoModMaliciousImmuneRoles.includes(role.id))
    ) {
      if (domainReg.test(message.content)) {
        const req = await fetch('https://anti-fish.bitflow.dev/check', {
          method: 'POST',
          headers: {
            'User-Agent': 'Parallel Discord Bot (https://discord.gg/v2AV3XtnBM)',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message.content
          })
        });

        if (req.ok) {
          await message.delete();

          const { infoWarn, infoMute, infoKick, infoBan } = automod;
          return this.automodPunish(
            message,
            'Malicious links.',
            automod.autoModMaliciousPunishment,
            automod.autoModMaliciousDuration,
            { infoWarn, infoMute, infoKick, infoBan },
            automod.escalations as Escalations
          );
        }
      }
    }

    if (
      automod.autoModSpamToggle &&
      !automod.autoModSpamImmuneChannels.includes(message.channelId) &&
      !message.member!.roles.cache.some(role => automod.autoModSpamImmuneRoles.includes(role.id))
    ) {
      const key = `${message.author.id}.${message.guildId}`;
      const userSpam = this.spamTrack.get(key)?.concat([Date.now()]) ?? [Date.now()];
      this.spamTrack.set(key, userSpam);

      for (const trigger of automod.autoModSpamTriggers as AutoModSpamTriggers) {
        const { amount, within } = trigger;
        if (userSpam.length < amount) continue;

        const speed = userSpam[userSpam.length - 1] - userSpam[userSpam.length - amount];
        if (speed > within * 1000) continue;

        this.spamTrack.set(key, []);
        const messages = [...(await message.channel.messages.fetch({ limit: 100 })).values()]
          .filter(msg => msg.author.id === message.author.id)
          .slice(0, amount);
        await message.channel.bulkDelete(messages);

        const { infoWarn, infoMute, infoKick, infoBan } = automod;
        return this.automodPunish(
          message,
          'Fast message spam.',
          automod.autoModSpamPunishment,
          automod.autoModSpamDuration,
          { infoWarn, infoMute, infoKick, infoBan },
          automod.escalations as Escalations
        );
      }

      const biggest = (automod.autoModSpamTriggers as AutoModSpamTriggers).reduce((prev, curr) =>
        curr.amount > prev.amount ? curr : prev
      ).amount;
      if (userSpam.length > biggest) this.spamTrack.set(key, userSpam.slice(1));
      return false;
    }
  }

  private async automodPunish(
    message: Message<true>,
    reason: 'Malicious links.' | 'Fast message spam.',
    punishment: InfractionType | null,
    duration: bigint,
    info: { infoWarn: string | null; infoMute: string | null; infoKick: string | null; infoBan: string | null },
    escalations: Escalations
  ) {
    if (!punishment) return false;

    const date = BigInt(Date.now());
    const expires = duration ? date + duration : null;
    const expiresStr = Math.floor(Number(expires) / 1000);

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: message.author.id,
        guildId: message.guildId,
        type: punishment,
        date,
        moderatorId: this.client.user!.id,
        expires,
        reason
      }
    });

    if (expires && punishment !== InfractionType.Warn) {
      const data = {
        guildId: message.guildId,
        userId: message.author.id,
        type: punishment,
        expires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: message.author.id, guildId: message.guildId, type: punishment }
        },
        update: data,
        create: data
      });
    }

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(
        `You were ${pastTenseInfractionTypes[punishment.toLowerCase() as keyof typeof pastTenseInfractionTypes]} ${
          punishment === InfractionType.Ban || punishment === InfractionType.Kick ? 'from' : 'in'
        } ${message.guild.name}`
      )
      .setColor(
        punishment === InfractionType.Warn
          ? Colors.Yellow
          : punishment === InfractionType.Mute || punishment === InfractionType.Kick
          ? Colors.Orange
          : punishment === InfractionType.Unmute || punishment === InfractionType.Unban
          ? Colors.Green
          : Colors.Red
      )
      .setDescription(`${reason}${expires ? `\n\n***•** Expires: <t:${expiresStr}> (<t:${expiresStr}:R>)*` : ''}`)
      .setFooter({ text: `Punishment ID: ${infraction.id}` })
      .setTimestamp();

    switch (punishment) {
      case InfractionType.Ban:
        if (info.infoBan) dm.addFields([{ name: 'Additional Information', value: info.infoBan }]);
      case InfractionType.Kick:
        if (info.infoKick) dm.addFields([{ name: 'Additional Information', value: info.infoKick }]);
      case InfractionType.Mute:
        if (info.infoMute) dm.addFields([{ name: 'Additional Information', value: info.infoMute }]);
      case InfractionType.Warn:
        if (info.infoWarn) dm.addFields([{ name: 'Additional Information', value: info.infoWarn }]);
    }

    await message.member!.send({ embeds: [dm] }).catch(() => {});

    this.client.emit('punishLog', infraction);

    switch (punishment) {
      case InfractionType.Ban:
        await message.member!.ban({ reason });
      case InfractionType.Kick:
        await message.member!.kick(reason);
      case InfractionType.Mute:
        await message.member!.timeout(Number(duration), reason);
    }

    if (punishment !== InfractionType.Warn) return true;

    // ESCALATION CHECK!
    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: message.guild.id,
        userId: message.member!.id,
        moderatorId: this.client.user!.id
      }
    });

    if (infractionCount === 0) return false;

    // find closest escalation
    const escalation = escalations.reduce(
      (prev, curr) =>
        infractionCount >= curr.amount
          ? infractionCount - curr.amount < infractionCount - prev.amount
            ? curr
            : prev
          : prev,
      { amount: 0, punishment: InfractionType.Warn, duration: '0' }
    );

    if (escalation.amount === 0) return false;

    const eDuration = BigInt(escalation.duration.slice(0, -1));
    const eExpires = eDuration ? date + eDuration : null;
    const eExpiresStr = Math.floor(Number(expires) / 1000);

    const eInfraction = await this.client.db.infraction.create({
      data: {
        userId: message.author.id,
        guildId: message.guildId,
        type: escalation.punishment,
        date,
        moderatorId: this.client.user!.id,
        expires: eExpires,
        reason: `${escalation.amount} infractions.`
      }
    });

    if (eExpires) {
      const data = {
        guildId: message.guildId,
        userId: message.author.id,
        type: escalation.punishment,
        expires: eExpires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: message.author.id, guildId: message.guildId, type: escalation.punishment }
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
          escalation.punishment === InfractionType.Ban || escalation.punishment === InfractionType.Kick ? 'from' : 'in'
        } ${message.guild.name}`
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
        if (info.infoBan) eDm.addFields([{ name: 'Additional Information', value: info.infoBan }]);
      case InfractionType.Kick:
        if (info.infoKick) eDm.addFields([{ name: 'Additional Information', value: info.infoKick }]);
      case InfractionType.Mute:
        if (info.infoMute) eDm.addFields([{ name: 'Additional Information', value: info.infoMute }]);
      case InfractionType.Warn:
        if (info.infoWarn) eDm.addFields([{ name: 'Additional Information', value: info.infoWarn }]);
    }

    await message.member!.send({ embeds: [eDm] });

    this.client.emit('punishLog', eInfraction);

    switch (escalation.punishment) {
      case InfractionType.Ban:
        await message.member!.ban({ reason });
      case InfractionType.Kick:
        await message.member!.kick(reason);
      case InfractionType.Mute:
        await message.member!.timeout(Number(eDuration), reason);
    }

    return true;
  }
}

export default AutomodListener;
