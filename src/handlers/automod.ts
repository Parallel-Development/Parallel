import { InfractionType } from '@prisma/client';
import { Colors, EmbedBuilder, Guild, GuildMember, Message, PermissionFlagsBits as Permissions } from 'discord.js';
import { domainReg, pastTenseInfractionTypes } from '../lib/util/constants';
import { AutoModSpamTriggers, Escalations } from '../types';
import client from '../client';
import ms from 'ms';
import punishLog from './punishLog';

// userId.guildId
const spamTrack = new Map<string, number[]>();

export default async function (message: Message<true>) {
  if (!message?.member) return;

  const automod = await client.db.guild.findUnique({
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

        return autoModPunish(
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
    const userSpam = spamTrack.get(key)?.concat([Date.now()]) ?? [Date.now()];
    spamTrack.set(key, userSpam);

    for (const trigger of automod.autoModSpamTriggers as AutoModSpamTriggers) {
      const { amount, within } = trigger;
      if (userSpam.length < amount) continue;

      const speed = userSpam[userSpam.length - 1] - userSpam[userSpam.length - amount];
      if (speed > within * 1000) continue;

      spamTrack.set(key, []);
      const messages = [...(await message.channel.messages.fetch({ limit: 100 })).values()]
        .filter(msg => msg.author.id === message.author.id)
        .slice(0, amount);
      await message.channel.bulkDelete(messages);

      return autoModPunish(
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
    if (userSpam.length > biggest) spamTrack.set(key, userSpam.slice(1));
    return false;
  }
}

export async function autoModPunish(
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

  await member!.send({ embeds: [dm] }).catch(() => {});

  punishLog(infraction);

  switch (punishment) {
    case InfractionType.Ban:
      await member!.ban({ reason });
      break;
    case InfractionType.Kick:
      await member!.kick(reason);
      break;
    case InfractionType.Mute:
      await member!.timeout(Number(duration), reason);
      break;
  }

  if (punishment !== InfractionType.Warn) return true;

  // ESCALATION CHECK!
  const infractionHistory = await client.db.infraction.findMany({
    where: {
      guildId: guild.id,
      userId: member!.id,
      type: InfractionType.Warn,
      moderatorId: client.user!.id
    },
    orderBy: {
      date: 'desc'
    }
  });

  if (infractionHistory.length === 0) return false;

  // find matching escalations
  const escalation = escalations.reduce(
    (prev, curr) => {
      const within = +curr.within;

      return infractionHistory.length >= curr.amount &&
        curr.amount >= prev.amount &&
        (within !== 0
          ? within < (+prev.within || Infinity) && date - infractionHistory[curr.amount - 1].date <= within
          : curr.amount !== prev.amount)
        ? curr
        : prev;
    },
    { amount: 0, within: '0', punishment: InfractionType.Warn, duration: '0' }
  );

  if (escalation.amount === 0) return false;

  const eDuration = BigInt(escalation.duration);
  const eExpires = eDuration ? date + eDuration : null;
  const eExpiresStr = Math.floor(Number(eExpires) / 1000);
  const eReason = `Reaching or exceeding ${escalation.amount} automod infractions${
    escalation.within !== '0' ? ` within ${ms(+escalation.within, { long: true })}` : ''
  }.`;

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
      break;
    case InfractionType.Kick:
      if (infoKick) eDm.addFields([{ name: 'Additional Information', value: infoKick }]);
      break;
    case InfractionType.Mute:
      if (infoMute) eDm.addFields([{ name: 'Additional Information', value: infoMute }]);
      break;
    case InfractionType.Warn:
      if (infoWarn) eDm.addFields([{ name: 'Additional Information', value: infoWarn }]);
      break;
  }

  await member!.send({ embeds: [eDm] }).catch(() => {});

  punishLog(eInfraction);

  switch (escalation.punishment) {
    case InfractionType.Ban:
      await member!.ban({ reason: eReason });
      break;
    case InfractionType.Kick:
      await member!.kick(eReason);
      break;
    case InfractionType.Mute:
      await member!.timeout(Number(eDuration), eReason);
      break;
  }

  return true;
}