import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import ms from 'ms';
import { InfractionType } from '@prisma/client';
import { adequateHierarchy, getMember, hasSlashCommandPermission } from '../../lib/util/functions';
import { d28, infractionColors } from '../../lib/util/constants';

@data(
  new SlashCommandBuilder()
    .setName('duration')
    .setDescription('Change the duration of a punishment.')
    .addIntegerOption(opt =>
      opt
        .setName('id')
        .setDescription('The ID of the infraction to change the duration of.')
        .setMinValue(1)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('duration')
        .setDescription('The new duration. Use `permanent` to make permanent.')
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('The reason for changing the duration').setMaxLength(3500)
    )
)
class DurationCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!(
      (await hasSlashCommandPermission(interaction.member, 'warn')) ||
      (await hasSlashCommandPermission(interaction.member, 'mute')) ||
      (await hasSlashCommandPermission(interaction.member, 'ban'))
    ))
      throw 'You do not have permission to use this command.';

    const id = interaction.options.getInteger('id', true);
    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    const durationStr = interaction.options.getString('duration', true);
    let duration: number | null = null;

    if (durationStr.toLowerCase() === 'permanent') duration = 0;
    else {
      const unaryTest = +durationStr;
      if (unaryTest) duration = unaryTest * 1000;
      else duration = ms(durationStr) ?? null;

      if (!duration) throw 'Invalid duration.';
    }

    if (duration !== 0 && duration < 1000) throw 'Duration must be at least 1 second.';

    const date = Date.now();
    const expires = duration ? date + duration : null;

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { guild: { select: { notifyInfractionChange: true, infractionModeratorPublic: true } } }
    });

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists in this guild.';

    if (
      infraction.type === InfractionType.Unban ||
      infraction.type === InfractionType.Unmute ||
      infraction.type === InfractionType.Kick
    )
      throw 'You cannot change the duration for that kind of infraction.';

    if (!(await hasSlashCommandPermission(interaction.member, infraction.type.toLowerCase())))
      throw 'You do not have permission to change the duration of this type of infraction.';

    if (infraction.expires !== null && date >= infraction.expires)
      throw 'This infraction has already expired.';

    if (infraction.type === InfractionType.Mute) {
      if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.MuteMembers))
        throw 'I do not have permission to mute members.';

      if (duration > d28 || duration === 0) throw 'Mute duration must be 28 days or less.';

      const member = await getMember(interaction.guild, infraction.userId);
      if (!member) throw 'Cannot change the duration of the mute because the user is no longer in the server.';

      if (!adequateHierarchy(interaction.guild.members.me!, member))
        throw 'I cannote mute this member due to inadequate hierarchy.';

      await member.timeout(duration, reason);
    }

    await interaction.deferReply();

    await this.client.db.infraction.update({
      where: { id },
      data: {
        expires
      }
    });

    if (infraction.type !== InfractionType.Warn) {
      if (expires)
        await this.client.db.task.update({
          where: {
            userId_guildId_type: {
              userId: infraction.userId,
              guildId: interaction.guildId,
              type: infraction.type
            }
          },
          data: {
            expires
          }
        });
      else
        await this.client.db.task.delete({
          where: {
            userId_guildId_type: {
              userId: infraction.userId,
              guildId: interaction.guildId,
              type: infraction.type
            }
          }
        });
    }

    const { notifyInfractionChange, infractionModeratorPublic } = infraction.guild;
    if (notifyInfractionChange) {
      const expiresStr = Math.floor(Number(expires) / 1000);

      const notifyDM = new EmbedBuilder()
        .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
        .setTitle(`${infraction.type} Duration Changed`)
        .setColor(infractionColors[infraction.type])
        .setDescription(
          `New Expiration: ${expires ? `<t:${expiresStr}> (<t:${expiresStr}:R>)` : 'never'}\nReason: ${reason}${infractionModeratorPublic ? `\n\n***•** Changed by: ${interaction.user.toString()}*` : ''}`
        )
        .setFooter({ text: `Original Infraction ID: ${infraction.id}` })
        .setTimestamp();

      const member = await getMember(interaction.guildId, infraction.userId);
      if (member) await member.send({ embeds: [notifyDM] }).catch(() => {});
    }

    return interaction.editReply(
      `${infraction.type} duration of infraction \`${infraction.id}\` for <@${infraction.userId}> changed to \`${
        duration ? ms(duration, { long: true }) : 'permanent'
      }\`.`
    );
  }
}

export default DurationCommand;
