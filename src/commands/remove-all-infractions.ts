import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits as Permissions } from 'discord.js';
import Command, { data } from '../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('remove-all-infractions')
    .setDescription('Remove all infractions from a user.')
    .setDefaultMemberPermissions(Permissions.ModerateMembers)
    .addUserOption(option =>
      option.setName('user').setDescription('The user to remove all infractions from').setRequired(true)
    )
)
class RemoveAllInfractions extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('user', true);

    const count = (
      await this.client.db.infraction.deleteMany({
        where: {
          userId: user.id,
          guildId: interaction.guildId
        }
      })
    ).count;

    if (count === 0) throw `**${user.tag}** has no infractions in this guild.`;

    return interaction.editReply(`Removed all infractions from **${user.tag}**`);
  }
}

export default RemoveAllInfractions;
