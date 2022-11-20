import { InfractionType } from "@prisma/client";
import { SlashCommandBuilder, PermissionFlagsBits as Permissions, type ChatInputCommandInteraction, EmbedBuilder, Colors } from "discord.js";
import ms from "ms";
import Command from "../lib/structs/Command";
import { adequateHierarchy } from "../lib/util/functions";
const d28 = ms('28d');

class MuteCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
      .setName('mute')
      .setDescription('Mute a member.')
      .setDefaultMemberPermissions(Permissions.ModerateMembers)
      .addUserOption(option =>
        option.setName('member')
        .setDescription('The member to mute.')
        .setRequired(true))
      .addStringOption(option =>
        option.setName('duration')
        .setDescription('The duration of the mute.')
        .setRequired(true))
      .addStringOption(option =>
        option.setName('reason')
        .setDescription('The reason for the mute.'))
    )
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === interaction.user.id) throw 'You cannot mute yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot mute me.';

    if (!adequateHierarchy(interaction.member, member))
      throw 'You cannot mute this member due to inadequete hierarchy.';

    if (!adequateHierarchy(interaction.guild.members.me!, member))
      throw 'I cannot mute this member due to inadequete hierarchy';

    const reason = interaction.options.getString('reason') ?? 'None';
    const uExpiration = interaction.options.getString('duration')!;
    const date = BigInt(Date.now());
    const expires = BigInt(ms(uExpiration));
    if (!expires) throw 'Invalid duration.';
    
    if (expires > d28)
      throw 'You cannot mute a member for more than `28 days.`'; 
    if (expires < 1000)
      throw `Mute duration must be at least 1 second. Consider using <t:/unmute:${this.client.user!.id}> if you want to unmute the user.`
    const expirationTimestamp = expires + date;
    
    await interaction.deferReply()

    await member.timeout(Number(expires), reason);

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: interaction.guildId,
        type: InfractionType.Mute,
        date,
        moderatorId: interaction.user.id,
        expires: expirationTimestamp,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true, infoMute: true }} }
    });

    const data = {
      guildId: interaction.guildId,
      userId: member.id,
      type: InfractionType.Mute,
      expires: expirationTimestamp
    }

    await this.client.db.task.upsert({
      where: { userId_guildId_type: { userId: member.id, guildId: interaction.guildId, type: InfractionType.Mute} },
      update: data,
      create: data
    });

    const { infractionModeratorPublic, infoMute } = infraction.guild;
    const expiresStr = Math.floor(Number(infraction.expires) / 1000);

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were muted in ${interaction.guild.name}`)
      .setColor(Colors.Yellow)
      .setDescription(
        `${reason}${
          expires ? `\n\n***•** Expires: <t:${expiresStr}> (<t:${expiresStr}:R>)*` : ''
        }${infractionModeratorPublic ? `\n***•** Muted by ${interaction.member.toString()}*\n` : ''}`
      )
      .setFooter({ text: `Punishment ID: ${infraction.id}` })
      .setTimestamp();

    if (infoMute) dm.addFields([
      { name: 'Additional Information', value: infoMute }
    ]);

    await member.send({ embeds: [dm] }).catch(() => {});

    this.client.emit('punishLog', infraction);

    return interaction.editReply(`Muted **${member.user.tag}** with ID \`${infraction.id}\``);
  }
}

export default MuteCommand;