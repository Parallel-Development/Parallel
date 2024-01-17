import { InfractionType } from '@prisma/client';
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { properties, data } from '../../lib/structs/Command';
import punishLog from '../../handlers/punishLog';

@data(
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a member from the guild.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option => option.setName('user').setDescription('The user to unban.').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for unbanning.').setMaxLength(3500))
)
@properties<'slash'>({
  clientPermissions: PermissionFlagsBits.BanMembers
})
class UnbanCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('user', true);
    if (!(await interaction.guild.bans.fetch(user.id).catch(() => null))) throw 'That user is not banned.';

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';
    const date = BigInt(Date.now());

    await interaction.deferReply();

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: user.id,
        guildId: interaction.guildId,
        type: InfractionType.Unban,
        date,
        moderatorId: interaction.user.id,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true } } }
    });

    await interaction.guild.members.unban(user.id, reason);

    punishLog(infraction);

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(`**${user.username}** has been unbanned with ID \`${infraction.id}\``);

    return interaction.editReply({ embeds: [embed] });
  }
}

export default UnbanCommand;
