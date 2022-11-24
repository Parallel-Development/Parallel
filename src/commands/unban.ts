import { InfractionType } from '@prisma/client';
import { SlashCommandBuilder, PermissionFlagsBits as Permissions, type ChatInputCommandInteraction } from 'discord.js';
import Command, { clientpermissions, data } from '../lib/structs/Command';

@data(new SlashCommandBuilder()
.setName('unban')
.setDescription('Unban a member from the guild.')
.setDefaultMemberPermissions(Permissions.KickMembers)
.addUserOption(option => option.setName('user').setDescription('The user to unban.').setRequired(true))
.addStringOption(option => option.setName('reason').setDescription('The reason for unbanning.')))
@clientpermissions([Permissions.BanMembers])
class UnbanCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('user', true);

    const reason = interaction.options.getString('reason') ?? 'None';
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

    this.client.emit('punishLog', infraction);

    return interaction.editReply(`Unbanned **${user.tag}** with ID \`${infraction.id}\``);
  }
}

export default UnbanCommand;
