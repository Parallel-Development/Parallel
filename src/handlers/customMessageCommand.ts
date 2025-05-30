import { InfractionType as IT, InfractionType } from '@prisma/client';
import { Colors, EmbedBuilder, GuildMember, Message, PermissionFlagsBits, User } from 'discord.js';
import { infractionColors, NoChannelPermissionError, pastTenseInfractionTypes } from '../lib/util/constants';
import {
  adequateHierarchy,
  getMember,
  getUser,
  hasChannelPermission,
  hasSlashCommandPermission
} from '../lib/util/functions';
import { Escalation } from '../types';
import ms from 'ms';
import client from '../client';
import punishLog from './punishLog';

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

  // Permission  & channel check
  if (!(await hasSlashCommandPermission(message.member!, commandName))) {
    if (!respondIfNoPermission) return;

    throw 'You do not have permission to use this command.';
  }

  const channelPermError = await hasChannelPermission(message.member!, message.channel, commandName);
  if (channelPermError !== true) {
    if (!respondIfNoPermission) return;

    let description = '';
    switch (channelPermError) {
      case NoChannelPermissionError.Server:
        description = 'You do not have permission to run commands in this server.';
        break;
      case NoChannelPermissionError.Channel:
        description = 'You do not have permission to run commands in this channel.';
        break;
      case NoChannelPermissionError.AllCommands:
        description = 'You do not have permission to run Parallel commands in this channel.';
        break;
      case NoChannelPermissionError.OneCommand:
        description = 'You do not have permission to run that command in this channel.';
        break;
    }

    throw description;
  }

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
      throw `You cannot ${lpunishment} this member due to inadequate hierarchy.`;

    if (punishment !== IT.Warn && !adequateHierarchy(message.guild.members.me!, target))
      throw `I cannot ${lpunishment} this member due to inadequate hierarchy.`;
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

  if (punishment !== IT.Warn) {
    if (expires) {
      const data = {
        guildId: message.guildId,
        userId: target.id,
        type: punishment,
        expires
      };

      await client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: target.id, guildId: message.guildId, type: punishment }
        },
        update: data,
        create: data
      });
    } else {
      await client.db.task
        .delete({
          where: {
            userId_guildId_type: { userId: target.id, guildId: message.guildId, type: punishment }
          }
        })
        .catch(() => {});
    }
  }

  const { infoBan, infoKick, infoMute, infoWarn, infractionModeratorPublic } = infraction.guild;

  const dm = new EmbedBuilder()
    .setAuthor({ name: 'Parallel Moderation', iconURL: client.user!.displayAvatarURL() })
    .setTitle(
      `You were ${pastTenseInfractionTypes[lpunishment as keyof typeof pastTenseInfractionTypes]} ${
        punishment === IT.Ban || punishment === IT.Kick ? 'from' : 'in'
      } ${message.guild.name}`
    )
    .setColor(infractionColors[punishment])
    .setDescription(
      `${reason}${expires ? `\n\n***•** Expires: <t:${expiresStr}> (<t:${expiresStr}:R>)*` : ''}${
        infractionModeratorPublic ? `\n***•** Warning issued by ${message.member!.toString()}*\n` : ''
      }`
    )
    .setFooter({ text: `Infraction ID: ${infraction.id}` })
    .setTimestamp();

  switch (punishment) {
    case IT.Ban:
      if (infoBan) dm.addFields([{ name: 'Additional Information', value: infoBan }]);
      break;
    case IT.Kick:
      if (infoKick) dm.addFields([{ name: 'Additional Information', value: infoKick }]);
      break;
    case IT.Mute:
      if (infoMute) dm.addFields([{ name: 'Additional Information', value: infoMute }]);
      break;
    case IT.Warn:
      if (infoWarn) dm.addFields([{ name: 'Additional Information', value: infoWarn }]);
      break;
  }

  if (target instanceof GuildMember) await target.send({ embeds: [dm] }).catch(() => {});

  punishLog(infraction);

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
      if (curr.amount < prev.amount) return prev;
      if (infractionHistory.length < curr.amount) return prev;

      const within = +curr.within;
      if (!within) return curr;

      const isWithin = date - Number(infractionHistory[curr.amount - 1].date) <= within;
      if (!isWithin) return prev;
      if (curr.amount > prev.amount) return curr;

      if (within < +prev.within) return curr;
      else return prev;
    },
    { amount: 0, within: '0', punishment: InfractionType.Warn, duration: '0' }
  );

  if (escalation.amount === 0) return false;

  if (!adequateHierarchy(message.guild.members.me!, target)) return;
  switch (escalation.punishment) {
    case InfractionType.Ban:
      if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.BanMembers)) return;
      break;
    case InfractionType.Kick:
      if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.KickMembers)) return;
      break;
    case InfractionType.Mute:
      if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.MuteMembers)) return;
      break;
  }

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
  } else if (escalation.punishment === IT.Ban) {
    await client.db.task
      .delete({
        where: {
          userId_guildId_type: { userId: target.id, guildId: message.guildId, type: IT.Ban }
        }
      })
      .catch(() => {});
  }

  const eDm = new EmbedBuilder()
    .setAuthor({ name: 'Parallel Moderation', iconURL: client.user!.displayAvatarURL() })
    .setTitle(
      `You were ${
        pastTenseInfractionTypes[escalation.punishment.toLowerCase() as keyof typeof pastTenseInfractionTypes]
      } ${
        escalation.punishment === InfractionType.Ban || escalation.punishment === InfractionType.Kick ? 'from' : 'in'
      } ${message.guild.name}`
    )
    .setColor(infractionColors[escalation.punishment])
    .setDescription(
      `${eInfraction.reason}${eExpires ? `\n\n***•** Expires: <t:${eExpiresStr}> (<t:${eExpiresStr}:R>)*` : ''}`
    )
    .setFooter({ text: `Infraction ID: ${eInfraction.id}` })
    .setTimestamp();

  switch (escalation.punishment) {
    case InfractionType.Ban:
      if (infraction.guild.infoBan)
        eDm.addFields([{ name: 'Additional Information', value: infraction.guild.infoBan }]);
      break;
    case InfractionType.Kick:
      if (infraction.guild.infoKick)
        eDm.addFields([{ name: 'Additional Information', value: infraction.guild.infoKick }]);
      break;
    case InfractionType.Mute:
      if (infraction.guild.infoMute)
        eDm.addFields([{ name: 'Additional Information', value: infraction.guild.infoMute }]);
      break;
    case InfractionType.Warn:
      if (infraction.guild.infoWarn)
        eDm.addFields([{ name: 'Additional Information', value: infraction.guild.infoWarn }]);
      break;
  }

  await target.send({ embeds: [eDm] }).catch(() => {});

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

  punishLog(eInfraction);
}
