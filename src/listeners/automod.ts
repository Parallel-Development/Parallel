import { InfractionType } from '@prisma/client';
import { Colors, EmbedBuilder, Guild, GuildMember, Message, PermissionFlagsBits as Permissions } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { domainReg, pastTenseInfractionTypes } from '../lib/util/constants';
import { AutoModSpamTriggers, Escalations } from '../types';
import client from '../client';

class AutomodListener extends Listener {
  // userId.guildId
  spamTrack: Map<string, number[]> = new Map();

  constructor() {
    super('automod');
  }

  async run(message: Message<true>) {
    if (!message?.member) return;

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

        ticketAutoModeration: true,

        tickets: {
          where: {
            channelId: message.channelId
          }
        }
      }
    });

    if (!automod) return;
    if (message.member.permissions.has(Permissions.Administrator)) return;
    if (!automod.ticketAutoModeration && automod.tickets.length > 0) return;

    if (
      automod.autoModMaliciousToggle &&
      !automod.autoModMaliciousImmuneChannels.includes(message.channelId) &&
      !message.member!.roles.cache.some(role => automod.autoModMaliciousImmuneRoles.includes(role.id))
    ) {
      if (domainReg.test(message.content)) {
        const req = await fetch('https://anti-fish.bitflow.dev/check', {
          method: 'POST',
          headers: {
            'User-Agent': 'Parallel Discord Bot (https://www.parallelbot.xyz)',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message.content
          })
        });

        if (req.ok) {
          await message.delete();

          return AutomodListener.autoModPunish(
            message.member,
            message.guild,
            'Malicious links.',
            automod.autoModMaliciousPunishment,
            automod.autoModMaliciousDuration
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

        return AutomodListener.autoModPunish(
          message.member,
          message.guild,
          'Fast message spam.',
          automod.autoModSpamPunishment,
          automod.autoModSpamDuration
        );
      }

      const biggest = (automod.autoModSpamTriggers as AutoModSpamTriggers).reduce((prev, curr) =>
        curr.amount > prev.amount ? curr : prev
      ).amount;
      if (userSpam.length > biggest) this.spamTrack.set(key, userSpam.slice(1));
      return false;
    }
  }

  public static async autoModPunish(
    member: GuildMember,
    guild: Guild,
    reason: string,
    punishment: InfractionType | null,
    duration: bigint
  ) {
    if (!punishment) return false;

    const { infoWarn, infoMute, infoKick, infoBan, escalationsAutoMod } = (await client.db.guild.findUnique({
      where: { id: guild.id }
    }))!;

    const escalations = escalationsAutoMod as Escalations;

    const date = BigInt(Date.now());
    const expires = duration ? date + duration : null;
    const expiresStr = Math.floor(Number(expires) / 1000);

    const infraction = await client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: guild.id,
        type: punishment,
        date,
        moderatorId: client.user!.id,
        expires,
        reason
      }
    });

    if (expires && punishment !== InfractionType.Warn) {
      const data = {
        guildId: guild.id,
        userId: member.id,
        type: punishment,
        expires
      };

      await client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: member.id, guildId: guild.id, type: punishment }
        },
        update: data,
        create: data
      });
    }

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: client.user!.displayAvatarURL() })
      .setTitle(
        `You were ${pastTenseInfractionTypes[punishment.toLowerCase() as keyof typeof pastTenseInfractionTypes]} ${
          punishment === InfractionType.Ban || punishment === InfractionType.Kick ? 'from' : 'in'
        } ${guild.name}`
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
        if (infoBan) dm.addFields([{ name: 'Additional Information', value: infoBan }]);
      case InfractionType.Kick:
        if (infoKick) dm.addFields([{ name: 'Additional Information', value: infoKick }]);
      case InfractionType.Mute:
        if (infoMute) dm.addFields([{ name: 'Additional Information', value: infoMute }]);
      case InfractionType.Warn:
        if (infoWarn) dm.addFields([{ name: 'Additional Information', value: infoWarn }]);
    }

    await member!.send({ embeds: [dm] }).catch(() => {});

    client.emit('punishLog', infraction);

    switch (punishment) {
      case InfractionType.Ban:
        await member!.ban({ reason });
      case InfractionType.Kick:
        await member!.kick(reason);
      case InfractionType.Mute:
        await member!.timeout(Number(duration), reason);
    }

    if (punishment !== InfractionType.Warn) return true;

    // ESCALATION CHECK!
    const infractionCount = await client.db.infraction.count({
      where: {
        guildId: guild.id,
        userId: member!.id,
        type: InfractionType.Warn,
        moderatorId: client.user!.id
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

    const eDuration = BigInt(escalation.duration);
    const eExpires = eDuration ? date + eDuration : null;
    const eExpiresStr = Math.floor(Number(eExpires) / 1000);
    const eReason = `Reaching or exceeding ${escalation.amount} automod infractions.`;

    const eInfraction = await client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: guild.id,
        type: escalation.punishment,
        date,
        moderatorId: client.user!.id,
        expires: eExpires,
        reason: eReason
      }
    });

    if (eExpires) {
      const data = {
        guildId: guild.id,
        userId: member.id,
        type: escalation.punishment,
        expires: eExpires
      };

      await client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: member.id, guildId: guild.id, type: escalation.punishment }
        },
        update: data,
        create: data
      });
    }

    const eDm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: client.user!.displayAvatarURL() })
      .setTitle(
        `You were ${
          pastTenseInfractionTypes[escalation.punishment.toLowerCase() as keyof typeof pastTenseInfractionTypes]
        } ${
          escalation.punishment === InfractionType.Ban || escalation.punishment === InfractionType.Kick ? 'from' : 'in'
        } ${guild.name}`
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
      .setFooter({ text: `Punishment ID: ${eInfraction.id}` })
      .setTimestamp();

    switch (escalation.punishment) {
      case InfractionType.Ban:
        if (infoBan) eDm.addFields([{ name: 'Additional Information', value: infoBan }]);
      case InfractionType.Kick:
        if (infoKick) eDm.addFields([{ name: 'Additional Information', value: infoKick }]);
      case InfractionType.Mute:
        if (infoMute) eDm.addFields([{ name: 'Additional Information', value: infoMute }]);
      case InfractionType.Warn:
        if (infoWarn) eDm.addFields([{ name: 'Additional Information', value: infoWarn }]);
    }

    await member!.send({ embeds: [eDm] }).catch(() => {});

    client.emit('punishLog', eInfraction);

    switch (escalation.punishment) {
      case InfractionType.Ban:
        await member!.ban({ reason: eReason });
      case InfractionType.Kick:
        await member!.kick(eReason);
      case InfractionType.Mute:
        await member!.timeout(Number(eDuration), eReason);
    }

    return true;
  }
}

export default AutomodListener;
