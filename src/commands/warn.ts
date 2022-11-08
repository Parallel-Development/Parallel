import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command from '../lib/structs/Command';
import ms from 'ms';
import { adequateHierarchy } from '../lib/util/functions';

class WarnCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue an infraction for a user.')
        .setDefaultMemberPermissions(Permissions.ModerateMembers)
        .addUserOption(option => option.setName('member').setDescription('The member to warn.').setRequired(true))
        .addStringOption(option =>
          option.setName('reason').setDescription('The reason for the infraction.').setMaxLength(1000)
        )
        .addStringOption(option =>
          option.setName('erase-after').setDescription('Erase the warning after the specific duration')
        )
    );
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === interaction.user.id) throw 'You cannot warn yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot warn me.';

    if (!adequateHierarchy(interaction.member, member))
      throw 'You cannot warn this member due to inadequete hierarchy.';

    const reason = interaction.options.getString('reason') ?? 'None';
    const uExpiration = interaction.options.getString('erase-after');
    const date = BigInt(Date.now());
    const expires = uExpiration ? BigInt(ms(uExpiration)) + date : null;

    await interaction.deferReply();

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: interaction.guildId,
        date,
        moderatorId: interaction.user.id,
        expires: expires ?? null,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true, infoWarn: true, logWebhookId: true }} }
    });

    const { infractionModeratorPublic, infoWarn, logWebhookId } = infraction.guild;

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

    if (infoWarn) dm.addFields([
      { name: 'Additional Information', value: infoWarn }
    ]);

    await member.send({ embeds: [dm] }).catch(() => {});
    this.client.emit('punishLog', infraction)

    return interaction.editReply(`Warning issued for **${member.user.tag}** with ID \`${infraction.id}\``);
  }
}

export default WarnCommand;