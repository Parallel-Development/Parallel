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
import { Escalation } from '../../types';

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
      throw 'You cannot warn this member due to inadequete hierarchy.';

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

    await this.client.infractions.createDM(infraction);
    this.client.infractions.createLog(infraction);

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
    }

    if (member) await this.client.infractions.createDM(eInfraction);

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

    this.client.infractions.createLog(eInfraction);
  }
}

export default WarnCommand;
