import { InfractionType } from '@prisma/client';
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  Colors
} from 'discord.js';
import ms from 'ms';
import Command, { properties, data } from '../../lib/structs/Command';
import { adequateHierarchy, parseDuration } from '../../lib/util/functions';
import punishLog from '../../handlers/punishLog';

@data(
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the guild.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option => option.setName('user').setDescription('The user to ban.').setRequired(true))
    .addStringOption(option =>
      option.setName('duration').setDescription('The duration of the ban.').setAutocomplete(true)
    )
    .addStringOption(option => option.setName('reason').setDescription('The reason for banning.').setMaxLength(3500))
    .addStringOption(option =>
      option
        .setName('delete-previous-messages')
        .setDescription('Delete messages sent in past...')
        .addChoices(
          { name: 'Previous hour', value: '1h' },
          { name: 'Previous 6 hours', value: '6h' },
          { name: 'Previous 12 hours', value: '12h' },
          { name: 'Previous 24 hours', value: '24h' },
          { name: 'Previous 3 days', value: '3d' },
          { name: 'Previous 7 days', value: '7d' }
        )
    )
)
@properties<'slash'>({
  clientPermissions: PermissionFlagsBits.BanMembers
})
class BanCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('user', true);
    const member = interaction.options.getMember('user');

    if (user.id === interaction.user.id) throw 'You cannot ban yourself.';
    if (user.id === this.client.user!.id) throw 'You cannot ban me.';

    if (member) {
      if (!adequateHierarchy(interaction.member, member))
        throw 'You cannot ban this member due to inadequete hierarchy.';

      if (!adequateHierarchy(interaction.guild.members.me!, member))
        throw 'I cannot ban this member due to inadequete hierarchy.';
    }

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    const durationStr = interaction.options.getString('duration');
    const duration = durationStr ? parseDuration(durationStr) : null;
    
    if (Number.isNaN(duration) && durationStr !== 'permanent') throw 'Invalid duration.'
    if (duration && duration < 1000) throw 'Temporary ban duration must be at least 1 second.';

    const date = Date.now();

    let expires = duration ? duration + date : null;
    const deleteMessageSeconds = Math.floor(
      ms(interaction.options.getString('delete-previous-messages') ?? '0s') / 1000
    );

    await interaction.deferReply();

    const guild = (await this.client.db.guild.findUnique({
      where: { id: interaction.guildId },
      select: { infractionModeratorPublic: true, infoBan: true, defaultBanDuration: true }
    }))!;

    if (!expires && durationStr !== 'permanent' && guild.defaultBanDuration !== 0n)
      expires = Number(guild.defaultBanDuration) + date;

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: user.id,
        guildId: interaction.guildId,
        type: InfractionType.Ban,
        date,
        moderatorId: interaction.user.id,
        expires,
        reason
      }
    });

    if (expires) {
      const data = {
        guildId: interaction.guildId,
        userId: user.id,
        type: InfractionType.Ban,
        expires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: user.id, guildId: interaction.guildId, type: InfractionType.Ban }
        },
        update: data,
        create: data
      });
    } else
      await this.client.db.task
        .delete({
          where: {
            userId_guildId_type: { userId: user.id, guildId: interaction.guildId, type: InfractionType.Ban }
          }
        })
        .catch(() => {});

    const { infractionModeratorPublic, infoBan } = guild;
    const expiresStr = Math.floor(Number(infraction.expires) / 1000);

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were banned from ${interaction.guild.name}`)
      .setColor(Colors.Red)
      .setDescription(
        `${reason}${expires ? `\n\n***•** Expires: <t:${expiresStr}> (<t:${expiresStr}:R>)*` : ''}${
          infractionModeratorPublic ? `\n***•** Banned by ${interaction.member.toString()}*\n` : ''
        }`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id}` })
      .setTimestamp();

    if (infoBan) dm.addFields([{ name: 'Additional Information', value: infoBan }]);

    if (member) await member.send({ embeds: [dm] }).catch(() => {});

    await interaction.guild.members.ban(user.id, { reason, deleteMessageSeconds });

    punishLog(infraction);

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(`**${user.username}** has been banned with ID \`${infraction.id}\``);

    return interaction.editReply({ embeds: [embed] });
  }
}

export default BanCommand;
