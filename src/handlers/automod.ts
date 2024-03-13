import { InfractionType } from '@prisma/client';
import {  Guild, GuildMember, Message, PermissionFlagsBits } from 'discord.js';
import { AutoModLocations, domainReg} from '../lib/util/constants';
import { AutoModConfig, AutoModSpamTrigger, Escalation } from '../types';
import client from '../client';
import ms from 'ms';

// userId.guildId
const spamTrack = new Map<string, number[]>();

export default async function (message: Message<true>) {
  if (!message?.member || message.author.bot) return;

  const automod = await client.db.guild.findUnique({
    where: {
      id: message.guildId
    },
    select: {
      autoMod: true,
      autoModSpamTriggers: true,

      ticketAutoModeration: true,

      tickets: {
        where: {
          channelId: message.channelId
        }
      }
    }
  });

  if (!automod) return;
  if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
  if (!automod.ticketAutoModeration && automod.tickets.length > 0) return;

  const malicious = automod.autoMod[AutoModLocations.MaliciousLinks] as AutoModConfig<'raw'>;
  const spam = automod.autoMod[AutoModLocations.Spam] as AutoModConfig<'raw'>;

  if (
    malicious.toggle &&
    !malicious.immuneChannels.includes(message.channelId) &&
    !message.member!.roles.cache.some(role => malicious.immuneRoles.includes(role.id))
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
        if (!malicious.punishment) return;

        return autoModPunish(
          message.member,
          message.guild,
          'Malicious links.',
          malicious.punishment,
          +malicious.duration
        );
      }
    }
  }

  if (
    spam.toggle &&
    !spam.immuneChannels.includes(message.channelId) &&
    !message.member!.roles.cache.some(role => spam.immuneRoles.includes(role.id))
  ) {
    const key = `${message.author.id}.${message.guildId}`;
    const userSpam = spamTrack.get(key)?.concat([Date.now()]) ?? [Date.now()];
    spamTrack.set(key, userSpam);

    for (const trigger of automod.autoModSpamTriggers as AutoModSpamTrigger[]) {
      const { amount, within } = trigger;
      if (userSpam.length < amount) continue;

      const speed = userSpam[userSpam.length - 1] - userSpam[userSpam.length - amount];
      if (speed > within * 1000) continue;

      spamTrack.set(key, []);
      const messages = [...(await message.channel.messages.fetch({ limit: 100 })).values()]
        .filter(msg => msg.author.id === message.author.id)
        .slice(0, amount);
      await message.channel.bulkDelete(messages);
      if (!spam.punishment) return;

      return autoModPunish(message.member, message.guild, 'Fast message spam.', spam.punishment, +spam.duration);
    }

    const biggest = (automod.autoModSpamTriggers as AutoModSpamTrigger[]).reduce((prev, curr) =>
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
  punishment: InfractionType,
  duration: number
) {
  if (!punishment) return false;

  switch (punishment) {
    case InfractionType.Ban:
      if (!member.guild.members.me!.permissions.has(PermissionFlagsBits.BanMembers)) return;
      break;
    case InfractionType.Mute:
      if (!member.guild.members.me!.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
      break;
    case InfractionType.Kick:
      if (!member.guild.members.me!.permissions.has(PermissionFlagsBits.KickMembers)) return;
      break;
  }

  const { infoWarn, infoMute, infoKick, infoBan, escalationsAutoMod } = (await client.db.guild.findUnique({
    where: { id: guild.id }
  }))!;

  const escalations = escalationsAutoMod as Escalation[];

  const date = Date.now();
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

  await client.infractions.createDM(infraction);

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

  client.infractions.createLog(infraction);

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
          ? within < (+prev.within || Infinity) && date - Number(infractionHistory[curr.amount - 1].date) <= within
          : curr.amount !== prev.amount)
        ? curr
        : prev;
    },
    { amount: 0, within: '0', punishment: InfractionType.Warn, duration: '0' }
  );

  if (escalation.amount === 0) return false;

  const eDuration = +escalation.duration;
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

  await client.infractions.createDM(eInfraction);

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

  client.infractions.createLog(eInfraction);
  return true;
}
