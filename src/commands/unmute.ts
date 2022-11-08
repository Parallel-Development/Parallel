import { InfractionType } from "@prisma/client";
import { SlashCommandBuilder, PermissionFlagsBits as Permissions, ChatInputCommandInteraction, EmbedBuilder, Colors } from "discord.js";
import Command from "../lib/structs/Command";
import { adequateHierarchy } from "../lib/util/functions";

class MuteCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
      .setName('unmute')
      .setDescription('Unmute a member.')
      .setDefaultMemberPermissions(Permissions.ModerateMembers)
      .addUserOption(option =>
        option.setName('member')
        .setDescription('The member to unmute.')
        .setRequired(true))
      .addStringOption(option =>
        option.setName('reason')
        .setDescription('The reason for the unmute.'))
    )
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === interaction.user.id) throw 'You cannot unmute yourself.';
    if (!member.isCommunicationDisabled()) throw 'This member is not muted.';

    if (!adequateHierarchy(interaction.guild.members.me!, member))
      throw 'I cannot unmute this member due to inadequete hierarchy';

    const reason = interaction.options.getString('reason') ?? 'None';
    const date = BigInt(Date.now());

    await interaction.deferReply();

    await member.timeout(null);

    await this.client.db.task.delete({
      where: {
        userId_guildId_type: {
          guildId: interaction.guildId,
          userId: member.id,
          type: InfractionType.Mute
        }
      }
    }).catch(() => {});

    const infraction = (await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: interaction.guildId,
        type: InfractionType.Unmute,
        moderatorId: interaction.user.id,
        date,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true }} }
    }))!;

    const { infractionModeratorPublic } = infraction.guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were unmuted in ${interaction.guild.name}`)
      .setColor(Colors.Green)
      .setDescription(
        `${reason}${infractionModeratorPublic ? `\n\n***•** Unmuted by ${interaction.member.toString()}*\n` : ''}`
      )
      .setTimestamp();

    await member.send({ embeds: [dm] }).catch(() => {});

    this.client.emit('punishLog', infraction);

    return interaction.editReply(`Unmuted **${member.user.tag}**.`);
  }
}

export default MuteCommand;