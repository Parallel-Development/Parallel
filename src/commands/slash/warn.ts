import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import ms from 'ms';
import { adequateHierarchy, getMember } from '../../lib/util/functions';
import { InfractionType } from '@prisma/client';
import { pastTenseInfractionTypes } from '../../lib/util/constants';
import { Escalations } from '../../types';

@data(
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue an infraction for a member.')
    .setDefaultMemberPermissions(Permissions.ModerateMembers)
    .addUserOption(option => option.setName('member').setDescription('The member to warn.').setRequired(true))
    .addStringOption(option =>
      option.setName('reason').setDescription('The reason for the infraction.').setMaxLength(3500)
    )
    .addStringOption(option =>
      option.setName('erase-after').setDescription('Erase the warning after the specific duration')
    )
)
class WarnCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === interaction.user.id) throw 'You cannot warn yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot warn me.';

    if (!adequateHierarchy(interaction.member, member))
      throw 'You cannot warn this member due to inadequete hierarchy.';

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    const durationStr = interaction.options.getString('erase-after');
    let duration = null;
    if (durationStr && durationStr !== 'never') {
      const unaryTest = +durationStr;
      if (unaryTest) duration = unaryTest * 1000;
      else duration = ms(durationStr) ?? null;

      if (!duration) throw 'Invalid duration.';
      duration = BigInt(duration);
    }
    if (duration && duration < 1000) throw 'Temporary warn duration must be at least 1 second.';

    const date = BigInt(Date.now());

    let expires = duration ? duration + date : null;

    await interaction.deferReply();

    const guild = (await this.client.db.guild.findUnique({
      where: { id: interaction.guildId }
    }))!;

    if (!expires && durationStr !== 'never' && guild.defaultWarnDuration !== 0n)
      expires = guild.defaultWarnDuration + date;

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
    this.client.emit('punishLog', infraction);

    await interaction.editReply(`Warning issued for **${member.user.username}** with ID \`${infraction.id}\``);

    // check for escalations
    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: interaction.guild.id,
        userId: member.user.id,
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

    if (escalation.amount === 0) return;

    const eDuration = BigInt(escalation.duration);
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
        reason: `Reaching or exceeding ${escalation.amount} infractions.`
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

    if (member) await member!.send({ embeds: [eDm] });

    switch (escalation.punishment) {
      case InfractionType.Ban:
        await member!.ban({ reason: eInfraction.reason });
      case InfractionType.Kick:
        if (member) await member!.kick(eInfraction.reason);
      case InfractionType.Mute:
        if (member) await member!.timeout(Number(eDuration), eInfraction.reason);
    }

    this.client.emit('punishLog', eInfraction);
  }
}

export default WarnCommand;
