import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { getMember } from '../../lib/util/functions';
import { infractionColors } from '../../lib/util/constants';

@data(
  new SlashCommandBuilder()
    .setName('change-reason')
    .setDescription('Change the reason for an infraction.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(option =>
      option.setName('id').setDescription('The infraction ID.').setMinValue(1).setRequired(true)
    )
    .addStringOption(option =>
      option.setName('new_reason').setDescription('New reason for infraction.').setMaxLength(3500).setRequired(true)
    )
)
class ChangeReason extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id', true);
    const newReason = interaction.options.getString('new_reason', true);

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: {
        guild: { select: { notifyInfractionChange: true, infractionModeratorPublic: true } }
      }
    });

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists in this guild.';

    if (newReason === infraction.reason) throw 'The two reasons are the same.';

    await interaction.deferReply();

    await this.client.db.infraction.update({
      where: {
        id
      },
      data: {
        reason: newReason
      }
    });

    const { notifyInfractionChange, infractionModeratorPublic } = infraction.guild;
    if (notifyInfractionChange) {
      const notifyDM = new EmbedBuilder()
        .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
        .setTitle(`${infraction.type} Reason Changed`)
        .setColor(infractionColors[infraction.type])
        .setDescription(
          `${newReason}${infractionModeratorPublic ? `\n\n***•** Changed by: ${interaction.user.toString()}*` : ''}`
        )
        .setFooter({ text: `Original Infraction ID: ${infraction.id}` })
        .setTimestamp();;

      const member = await getMember(interaction.guildId, infraction.userId);
      if (member) await member.send({ embeds: [notifyDM] }).catch(() => {});
    }

    return interaction.editReply('Infraction reason changed.');
  }
}

export default ChangeReason;
