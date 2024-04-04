import { EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import ms from 'ms';
import { adequateHierarchy, getMember, parseDuration } from '../../lib/util/functions';
import { Escalation } from '../../types';
import { InfractionType } from '@prisma/client';
import { infractionColors, pastTenseInfractionTypes } from '../../lib/util/constants';
import punishLog from '../../handlers/punishLog';

@properties<'message'>({
  name: 'warn',
  description: 'Issue an infraction for a member.',
  args: '<member> [erase-after] [reason]',
  aliases: ['w', 'strike']
})
class WarnCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `member`.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === message.author.id) throw 'You cannot warn yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot warn me.';

    if (!adequateHierarchy(message.member!, member)) throw 'You cannot warn this member due to inadequate hierarchy.';

    const durationStr = args[1];
    let duration = null;
    if (durationStr && durationStr !== 'permanent') duration = parseDuration(durationStr);

    if (duration && duration < 1000) throw 'Temporary warn duration must be at least 1 second.';

    const date = Date.now();

    let expires = duration ? duration + date : null;

    if (duration || durationStr === 'permanent') args.shift();
    const reason = args.slice(1).join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const guild = (await this.client.db.guild.findUnique({
      where: { id: message.guildId }
    }))!;

    if (!expires && durationStr !== 'permanent' && guild.defaultWarnDuration !== 0n)
      expires = Number(guild.defaultWarnDuration) + date;

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: message.guildId,
        date,
        moderatorId: message.author.id,
        expires,
        reason
      }
    });

    const { infractionModeratorPublic, infoWarn } = guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You received a warning in ${message.guild.name}`)
      .setColor(Colors.Yellow)
      .setDescription(
        `${reason}${
          expires ? `\n\n***•** This warning is valid until <t:${Math.floor(Number(infraction.expires) / 1000)}>*` : ''
        }${infractionModeratorPublic ? `\n***•** Warning issued by ${message.member!.toString()}*\n` : ''}`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id}` })
      .setTimestamp();

    if (infoWarn) dm.addFields([{ name: 'Additional Information', value: infoWarn }]);

    await member.send({ embeds: [dm] }).catch(() => {});
    punishLog(infraction);

    const embed = new EmbedBuilder()
      .setColor(Colors.Yellow)
      .setDescription(`**${member.user.username}** has been warned with ID \`${infraction.id}\``);

    await message.reply({ embeds: [embed] });

    // ESCALATION CHECK!
    const infractionHistory = await this.client.db.infraction.findMany({
      where: {
        guildId: guild.id,
        userId: member!.id,
        type: InfractionType.Warn,
        moderatorId: { not: this.client.user!.id }
      },
      orderBy: {
        date: 'desc'
      }
    });

    if (infractionHistory.length === 0) return false;

    // find matching escalations
    const escalation = (guild.escalationsManual as Escalation[]).reduce(
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

    const eInfraction = await this.client.db.infraction.create({
      data: {
        userId: member.user.id,
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
        userId: member.user.id,
        type: escalation.punishment,
        expires: eExpires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: {
            userId: member.user.id,
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
      .setColor(infractionColors[escalation.punishment])
      .setDescription(
        `${eInfraction.reason}${eExpires ? `\n\n***•** Expires: <t:${eExpiresStr}> (<t:${eExpiresStr}:R>)*` : ''}`
      )
      .setFooter({ text: `Infraction ID: ${eInfraction.id}` })
      .setTimestamp();

    switch (escalation.punishment) {
      case InfractionType.Ban:
        if (guild.infoBan) eDm.addFields([{ name: 'Additional Information', value: guild.infoBan }]);
        break;
      case InfractionType.Kick:
        if (guild.infoKick) eDm.addFields([{ name: 'Additional Information', value: guild.infoKick }]);
        break;
      case InfractionType.Mute:
        if (guild.infoMute) eDm.addFields([{ name: 'Additional Information', value: guild.infoMute }]);
        break;
      case InfractionType.Warn:
        if (guild.infoWarn) eDm.addFields([{ name: 'Additional Information', value: guild.infoWarn }]);
        break;
    }

    if (member) await member!.send({ embeds: [eDm] }).catch(() => {});

    switch (escalation.punishment) {
      case InfractionType.Ban:
        await member!.ban({ reason: eInfraction.reason });
        break;
      case InfractionType.Kick:
        if (member) await member!.kick(eInfraction.reason);
        break;
      case InfractionType.Mute:
        if (member) await member!.timeout(Number(eDuration), eInfraction.reason);
        break;
    }

    punishLog(eInfraction);
  }
}

export default WarnCommand;
