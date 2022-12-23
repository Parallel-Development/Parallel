import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command, { data } from '../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Reference text.')
    .addStringOption(option =>
      option.setName('name').setDescription('Name of the tag you are referencing.').setRequired(true)
    )
    .addUserOption(option => option.setName('target-member').setDescription('Direct the tag at the target member.'))
)
class TagCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const name = interaction.options.getString('name', true).toLowerCase();
    const target = interaction.options.getMember('target-member');

    const tag = await this.client.db.tag.findUnique({
      where: {
        guildId_name: { guildId: interaction.guildId, name }
      }
    });

    if (!tag) throw `Tag does not exist.`;

    return interaction.reply({
      content: `${target ? `*Tag suggestion for ${target.toString()}*\n` : ''}${tag.content}`,
      allowedMentions: { parse: ['users'] }
    });
  }
}

export default TagCommand;
