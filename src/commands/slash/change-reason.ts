import {
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { getMember } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('change-reason')
    .setDescription('Change the reason for an infraction.')
    .setDefaultMemberPermissions(Permissions.ModerateMembers)
    .addIntegerOption(option =>
      option.setName('id').setDescription('The infraction ID.').setMinValue(1).setRequired(true)
    )
    .addStringOption(option =>
      option.setName('new_reason').setDescription('New reason for infraction.').setMaxLength(1000).setRequired(true)
    )
)
class ChangeReason extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id', true);
    const newReason = interaction.options.getString('new_reason', true);

    await interaction.deferReply();

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: {
        guild: { select: { notifyInfractionChange: true } }
      }
    });

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists in this guild.';

    if (newReason === infraction.reason) throw 'The two reasons are the same.';

    await this.client.db.infraction.update({
      where: {
        id
      },
      data: {
        reason: newReason
      }
    });

    const { notifyInfractionChange } = infraction.guild;
    if (notifyInfractionChange) {
      const notifyDM = new EmbedBuilder()
        .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
        .setTitle('Infraction Reason Changed')
        .setColor(Colors.Yellow)
        .setDescription(
          `**Infraction ID:** \`${
            infraction.id
          }\`\n**Infraction punishment:** \`${infraction.type.toString()}\`\n${newReason}`
        );

      const member = await getMember(interaction.guildId, infraction.userId);
      if (member) await member.send({ embeds: [notifyDM] }).catch(() => {});
    }

    return interaction.editReply('Infraction reason changed.');
  }
}

export default ChangeReason;
