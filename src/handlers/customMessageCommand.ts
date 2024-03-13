import { InfractionType as IT, InfractionType } from '@prisma/client';
import { EmbedBuilder, GuildMember, Message, PermissionFlagsBits, User } from 'discord.js';
import { infractionColors, pastTenseInfractionTypes } from '../lib/util/constants';
import { adequateHierarchy, getMember, getUser, hasSlashCommandPermission } from '../lib/util/functions';
import { Escalation } from '../types';
import ms from 'ms';
import client from '../client';

export default async function (
  message: Message<true>,
  args: string[],
  commandName: string,
  respondIfNoPermission: boolean
) {
  if (!message.member) return;

  const command = await client.db.shortcut.findUnique({
    where: {
      guildId_name: { guildId: message.guildId, name: commandName }
    }
  });

  if (!command) return;

  if (!(await hasSlashCommandPermission(message.member, commandName, 'guild')))
    if (respondIfNoPermission) throw 'You do not have permission to use this command.';
    else return;

  switch (command.punishment) {
    case InfractionType.Ban:
    case InfractionType.Unban:
      if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.BanMembers))
        throw 'I must have the `Ban Members` permission to run this command.';
      break;
    case InfractionType.Mute:
    case InfractionType.Unmute:
      if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.ModerateMembers))
        throw 'I must have the `Mute Members` permission to run this command.';
      break;
    case InfractionType.Kick:
      if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.KickMembers))
        throw 'I must have the `Kick Members` permission to run this command.';
      break;
  }

  if (args.length == 0) throw 'Missing required argument `user`.';

  const target = (await getMember(message.guildId, args[0])) ?? (await getUser(args[0]));

  if (!target) throw 'Invalid user.';
  if (command.punishment !== IT.Ban && command.punishment !== IT.Unban && target instanceof User)
    throw 'The provided user is not in this guild.';

  const { punishment, reason, duration, deleteTime } = command;
  const date = Date.now();
  const expires = duration ? date + Number(duration) : null;
  const expiresStr = expires ? Math.floor(Number(expires) / 1000) : null;
  const lpunishment = punishment.toLowerCase();

  if (punishment === IT.Unban && !(await message.guild.bans.fetch(target.id).catch(() => null)))
    throw 'That user is not banned.';

  if (target.id === message.author.id) throw `You cannot ${lpunishment} yourself.`;
  if (target.id === client.user!.id) throw `You cannot ${lpunishment} me.`;

  if (target instanceof GuildMember) {
    if (punishment === IT.Mute && target.permissions.has(PermissionFlagsBits.Administrator))
      throw 'You cannot mute an administrator.';

    if (!adequateHierarchy(message.member, target))
      throw `You cannot ${lpunishment} this member due to inadequete hierarchy.`;

    if (punishment !== IT.Warn && !adequateHierarchy(message.guild.members.me!, target))
      throw `I cannot ${lpunishment} this member due to inadequete hierarchy.`;
  }

  const infraction = await client.db.infraction.create({
    data: {
      guildId: message.guildId,
      userId: target.id,
      type: punishment,
      date,
      moderatorId: message.author.id,
      expires,
      reason
    },
    include: {
      guild: {
        select: {
          infractionModeratorPublic: true,
          infoBan: true,
          infoKick: true,
          infoMute: true,
          infoWarn: true,
          escalationsManual: true
        }
      }
    }
  });

  if (expires) {
    const data = {
      guildId: message.guildId,
      userId: target.id,
      type: punishment,
      expires
    };

    if (punishment === IT.Mute)
      await client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: target.id, guildId: message.guildId, type: punishment }
        },
        update: data,
        create: data
      });
  }

  if (target instanceof GuildMember) await client.infractions.createDM(infraction);

  switch (punishment) {
    case IT.Ban:
      await message.guild.members.ban(target.id, { reason, deleteMessageSeconds: deleteTime ?? undefined });
      break;
    case IT.Kick:
      await message.guild.members.kick(target.id, reason);
      break;
    case IT.Mute:
      await (target as GuildMember).timeout(Number(duration), reason);
      break;
    case IT.Unban:
      await message.guild.bans.remove(target.id, reason);
      break;
    case IT.Unmute:
      await (target as GuildMember).timeout(null);
      break;
  }

  client.infractions.createLog(infraction);

  const tense = pastTenseInfractionTypes[lpunishment as keyof typeof pastTenseInfractionTypes];

  const embed = new EmbedBuilder()
    .setColor(infractionColors[punishment])
    .setDescription(
      `**${target instanceof GuildMember ? target.user.username : target.username}** has been ${tense} with ID \`${
        infraction.id
      }\``
    );

  message.reply({ embeds: [embed] });

  if (infraction.type !== InfractionType.Warn) return;
  if (!(target instanceof GuildMember)) return;

  // ESCALATION CHECK!
  const infractionHistory = await client.db.infraction.findMany({
    where: {
      guildId: message.guild.id,
      userId: target.id,
      type: InfractionType.Warn,
      moderatorId: { not: client.user!.id }
    },
    orderBy: {
      date: 'desc'
    }
  });

  if (infractionHistory.length === 0) return false;

  // find matching escalations
  const escalation = (infraction.guild.escalationsManual as Escalation[]).reduce(
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

  const eInfraction = await client.db.infraction.create({
    data: {
      userId: target.id,
      guildId: message.guildId,
      type: escalation.punishment,
      date,
      moderatorId: client.user!.id,
      expires: eExpires,
      reason: `Reaching or exceeding ${escalation.amount} manual infractions${
        escalation.within !== '0' ? ` within ${ms(+escalation.within, { long: true })}` : ''
      }.`
    }
  });

  if (eExpires) {
    const data = {
      guildId: message.guildId,
      userId: target.id,
      type: escalation.punishment,
      expires: eExpires
    };

    await client.db.task.upsert({
      where: {
        userId_guildId_type: {
          userId: target.id,
          guildId: message.guildId,
          type: escalation.punishment
        }
      },
      update: data,
      create: data
    });
  }

  await client.infractions.createDM(eInfraction);

  switch (escalation.punishment) {
    case InfractionType.Ban:
      await target.ban({ reason: eInfraction.reason });
      break;
    case InfractionType.Kick:
      await target.kick(eInfraction.reason);
      break;
    case InfractionType.Mute:
      await target.timeout(Number(eDuration), eInfraction.reason);
      break;
  }

  client.infractions.createLog(eInfraction);
}
