import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command, { allowDM, data } from '../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Get a user's avatar.")
    .addUserOption(option => option.setName('user').setDescription('The user to get the avatar of.'))
)
@allowDM
class AvatarCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    return interaction.reply(user.displayAvatarURL({ size: 4096 }));
  }
}

export default AvatarCommand;
