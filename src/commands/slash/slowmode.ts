import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits as Permissions } from 'discord.js';
import ms from 'ms';
import Command, { data } from '../../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Modify the slowmode in a channel.')
    .setDefaultMemberPermissions(Permissions.ManageChannels)
    .addStringOption(option =>
      option.setName('slowmode').setDescription('Slowmode to set.').setRequired(true).setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('method')
        .setDescription('Choose to add or remove to the current slowmode.')
        .addChoices({ name: 'Set', value: 'set' }, { name: 'Add', value: 'add' }, { name: 'Remove', value: 'subtract' })
    )
)
class SlowmodeCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!interaction.channel?.isTextBased()) throw "You can't set the slowmode in this channel.";
    if (!interaction.channel.permissionsFor(interaction.guild.members.me!).has(Permissions.ManageChannels))
      throw 'I do not have permission to change the slowmode in this channel.';

    const uSlowmode = interaction.options.getString('slowmode', true);
    const method = interaction.options.getString('method') ?? ('set' as 'set' | 'add' | 'subtract');

    let slowmode = +uSlowmode || Math.floor(ms(uSlowmode) / 1000);
    if (Number.isNaN(slowmode)) throw 'Invalid slowmode.';

    switch (method) {
      case 'add':
        slowmode += interaction.channel.rateLimitPerUser ?? 0;
        break;
      case 'subtract':
        slowmode = (interaction.channel.rateLimitPerUser ?? 0) - slowmode;
        break;
    }

    if (slowmode !== 0 && slowmode < 1) throw 'Slowmode must be at least 1 second or 0.';
    if (slowmode > 21600) throw 'Slowmode cannot be greater than 6 hours.';

    await interaction.channel.setRateLimitPerUser(slowmode);
    if (slowmode === 0) return interaction.reply('Slowmode disabled.');
    return interaction.reply(`Slowmode set to \`${ms(slowmode * 1000, { long: true })}\`.`);
  }
}

export default SlowmodeCommand;
