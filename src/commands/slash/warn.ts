import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import ms from 'ms';
import { adequateHierarchy, parseDuration } from '../../lib/util/functions';
import { InfractionType } from '@prisma/client';
import { infractionColors, pastTenseInfractionTypes } from '../../lib/util/constants';
import { Escalation } from '../../types';
import punishLog from '../../handlers/punishLog';

@data(
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue an infraction for a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('member').setDescription('The member to warn.').setRequired(true))
    .addStringOption(option =>
      option.setName('reason').setDescription('The reason for the infraction.').setMaxLength(3500)
    )
    .addStringOption(option =>
      option
        .setName('erase-after')
        .setDescription('Erase the warning after the specific duration')
        .setAutocomplete(true)
    )
)
class WarnCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === interaction.user.id) throw 'You cannot warn yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot warn me.';

    if (!adequateHierarchy(interaction.member, member))
      throw 'You cannot warn this member due to inadequate hierarchy.';

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    const durationStr = interaction.options.getString('erase-after');
    const duration = durationStr ? parseDuration(durationStr) : null;

    if (Number.isNaN(duration) && durationStr !== 'permanent') throw 'Invalid duration.';
    if (duration && duration < 1000) throw 'Temporary warn duration must be at least 1 second.';

    const date = Date.now();

    let expires = duration ? duration + date : null;

    await interaction.deferReply();

    const guild = (await this.client.db.guild.findUnique({
      where: { id: interaction.guildId }
    }))!;

    if (!expires && durationStr !== 'permanent' && guild.defaultWarnDuration !== 0n)
      expires = Number(guild.defaultWarnDuration) + date;

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: interaction.guildId,
        date,
        moderatorId: interaction.user.id,
        expires,
        reason
      }
    });

    const { infractionModeratorPublic, infoWarn } = guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You received a warning in ${interaction.guild.name}`)
      .setColor(Colors.Yellow)
      .setDescription(
        `${reason}${
          expires ? `\n\n***•** This warning is valid until <t:${Math.floor(Number(infraction.expires) / 1000)}>*` : ''
        }${infractionModeratorPublic ? `\n***•** Warning issued by ${interaction.member.toString()}*\n` : ''}`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id}` })
      .setTimestamp();

    if (infoWarn) dm.addFields([{ name: 'Additional Information', value: infoWarn }]);

    await member.send({ embeds: [dm] }).catch(() => {});
    punishLog(infraction);

    const embed = new EmbedBuilder()
      .setColor(Colors.Yellow)
      .setDescription(`**${member.user.username}** has been warned with ID \`${infraction.id}\``);

    await interaction.editReply({ embeds: [embed] });

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

    if (!adequateHierarchy(interaction.guild.members.me!, member)) return;
    switch (escalation.punishment) {
      case InfractionType.Ban:
        if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.BanMembers)) return;
        break;
      case InfractionType.Kick:
        if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.KickMembers)) return;
        break;
      case InfractionType.Mute:
        if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.MuteMembers)) return;
        break;
    }

    const eDuration = +escalation.duration;
    const eExpires = eDuration ? date + eDuration : null;
    const eExpiresStr = Math.floor(Number(eExpires) / 1000);

    const eInfraction = await this.client.db.infraction.create({
      data: {
        userId: member.user.id,
        guildId: interaction.guildId,
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
        guildId: interaction.guildId,
        userId: member.user.id,
        type: escalation.punishment,
        expires: eExpires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: {
            userId: member.user.id,
            guildId: interaction.guildId,
            type: escalation.punishment
          }
        },
        update: data,
        create: data
      });
    } else if (escalation.punishment === InfractionType.Ban) {
      await this.client.db.task
        .delete({
          where: {
            userId_guildId_type: { userId: member.id, guildId: interaction.guildId, type: InfractionType.Ban }
          }
        })
        .catch(() => {});
    }

    const eDm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(
        `You were ${
          pastTenseInfractionTypes[escalation.punishment.toLowerCase() as keyof typeof pastTenseInfractionTypes]
        } ${
          escalation.punishment === InfractionType.Ban || escalation.punishment === InfractionType.Kick ? 'from' : 'in'
        } ${interaction.guild.name}`
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
