import { InfractionType as IT, InfractionType } from '@prisma/client';
import {
  ApplicationCommandPermissionType,
  Colors,
  EmbedBuilder,
  GuildMember,
  Message,
  PermissionFlagsBits as Permissions
} from 'discord.js';
import Listener from '../lib/structs/Listener';
import { pastTenseInfractionTypes } from '../lib/util/constants';
import { adequateHierarchy, getMember, getUser } from '../lib/util/functions';
import { Escalations } from '../types';
import ms from 'ms';

class CustomMessageCommandListener extends Listener {
  constructor() {
    super('customMessageCommand');
  }

  async run(message: Message<true>, args: string[], commandName: string, respondIfNoPermission: boolean) {
    if (!message.member) return;

    const command = await this.client.db.shortcut.findUnique({
      where: {
        guildId_name: { guildId: message.guildId, name: commandName }
      }
    });

    if (!command) return;

    if (message.author.id !== message.guildId) {
      const slashCommand =
        message.guild.commands.cache.find(c => c.name === commandName) ||
        (await message.guild!.commands.fetch().then(cmds => cmds.find(cmd => cmd.name === commandName)))!;

      const permissions = await this.client
        .application!.commands.permissions.fetch({ command: slashCommand.id, guild: message.guildId! })
        .catch(() => null);

      const hasDefault = message.member!.permissions?.has(slashCommand.defaultMemberPermissions!);
      const allowed = permissions?.filter(
        permission =>
          permission.permission === true &&
          (permission.id === message.author.id || message.member!.roles.cache.some(r => permission.id === r.id))
      );
      const denied = permissions?.filter(
        permission =>
          permission.permission === false &&
          (permission.id === message.author.id || message.member!.roles.cache.some(r => permission.id === r.id))
      );

      if (denied?.some(deny => deny.type === ApplicationCommandPermissionType.User)) {
        if (respondIfNoPermission) message.reply("You don't have permission to use that command.");
        return false;
      }

      if (!allowed?.length && !(denied?.length && hasDefault)) {
        if (
          !message.member!.roles.cache.some(
            r => r.permissions.has(slashCommand.defaultMemberPermissions!) && !denied?.some(role => role.id === r.id)
          )
        ) {
          if (respondIfNoPermission) message.reply("You don't have permission to use that command.");
          return false;
        }
      }
    }

    if (args.length == 0) return message.reply('Missing required argument `user`.');

    const target = (await getMember(message.guildId, args[0])) ?? (await getUser(args[0]));

    if (!target) return message.reply('The provided user is not in this guild.');

    const { punishment, reason, duration, deleteTime } = command;
    const date = BigInt(Date.now());
    const expires = duration ? date + duration : null;
    const expiresStr = expires ? Math.floor(Number(expires) / 1000) : null;
    const lpunishment = punishment.toLowerCase();

    if (punishment === IT.Unban && !(await message.guild.bans.fetch(target.id).catch(() => null)))
      return message.reply('That user is not banned.');

    if (target.id === message.author.id) return message.reply(`You cannot ${lpunishment} yourself.`);
    if (target.id === this.client.user!.id) return message.reply(`You cannot ${lpunishment} me.`);

    if (target instanceof GuildMember) {
      if (punishment === IT.Mute && target.permissions.has(Permissions.Administrator))
        return message.reply('You cannot mute an administrator.');

      if (!adequateHierarchy(message.member, target))
        return message.reply(`You cannot ${lpunishment} this member due to inadequete hierarchy.`);

      if (punishment !== IT.Warn && !adequateHierarchy(message.guild.members.me!, target))
        return message.reply(`I cannot ${lpunishment} this member due to inadequete hierarchy.`);
    }

    const infraction = await this.client.db.infraction.create({
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
        await this.client.db.task.upsert({
          where: {
            userId_guildId_type: { userId: target.id, guildId: message.guildId, type: punishment }
          },
          update: data,
          create: data
        });
    }

    const { infoBan, infoKick, infoMute, infoWarn } = infraction.guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(
        `You were ${pastTenseInfractionTypes[lpunishment as keyof typeof pastTenseInfractionTypes]} ${
          punishment === IT.Ban || punishment === IT.Kick ? 'from' : 'in'
        } ${message.guild.name}`
      )
      .setColor(
        punishment === IT.Warn
          ? Colors.Yellow
          : punishment === IT.Mute || punishment === IT.Kick
          ? Colors.Orange
          : punishment === IT.Unmute || punishment === IT.Unban
          ? Colors.Green
          : Colors.Red
      )
      .setDescription(`${reason}${expires ? `\n\n***•** Expires: <t:${expiresStr}> (<t:${expiresStr}:R>)*` : ''}`)
      .setFooter({ text: `Punishment ID: ${infraction.id}` })
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

    if (target instanceof GuildMember) await target!.send({ embeds: [dm] }).catch(() => {});

    this.client.emit('punishLog', infraction);

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
    const upperTense = tense[0].toUpperCase() + tense.slice(1);

    message.reply(
      `${upperTense} **${target instanceof GuildMember ? target.user.username : target.username}** with ID \`${
        infraction.id
      }\``
    );

    if (infraction.type !== InfractionType.Warn) return;
    if (!(target instanceof GuildMember)) return;

    // ESCALATION CHECK!
    const infractionHistory = await this.client.db.infraction.findMany({
      where: {
        guildId: message.guild.id,
        userId: target!.id,
        type: InfractionType.Warn,
        moderatorId: { not: this.client.user!.id }
      },
      orderBy: {
        date: 'desc'
      }
    });

    if (infractionHistory.length === 0) return false;

    // find matching escalations
    const escalation = (infraction.guild.escalationsManual as Escalations).reduce(
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

    const eInfraction = await this.client.db.infraction.create({
      data: {
        userId: target.id,
        guildId: message.guildId,
        type: escalation.punishment,
        date,
        moderatorId: this.client.user!.id,
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

      await this.client.db.task.upsert({
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
      .setFooter({ text: `Punishment ID: ${eInfraction.id}` })
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

    await target.send({ embeds: [eDm] });

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

    this.client.emit('punishLog', eInfraction);
  }
}

export default CustomMessageCommandListener;
