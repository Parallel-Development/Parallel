import { ChatInputCommandInteraction, Colors, EmbedBuilder, Message, SlashCommandBuilder } from 'discord.js';
import Command, { data, properties } from '../../lib/structs/Command';
import { mainColor } from '../../lib/util/constants';
import ms from 'ms';

@data(
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all commands for Parallel.')
    .addStringOption(opt =>
      opt.setName('command').setDescription('Get specific help on a command.').setAutocomplete(true)
    )
)
@properties({
  allowDM: true
})
class HelpCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('command');
    if (commandName) {
      const command =
        this.client.commands.message.get(commandName) ??
        this.client.commands.message.get(this.client.aliases.get(commandName) as string);

      if (!command) {
        // check for shortcut
        if (!interaction.inGuild()) throw 'No command with that name or alias exists.';
        const shortcut = await this.client.db.shortcut.findUnique({
          where: {
            guildId_name: { guildId: interaction.guildId, name: commandName }
          }
        });

        if (!shortcut) throw 'No command with that name or alias exists.';

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle(shortcut.name)
          .setColor(mainColor)
          .setDescription(
            `${shortcut.description}\n\nThis command will \`${shortcut.punishment.toLowerCase()}\` the provided user${
              shortcut.duration ? ` for \`${ms(Number(shortcut.duration), { long: true })}\`` : ''
            }${
              shortcut.deleteTime
                ? ` and purge messages by them up to \`${ms(shortcut.deleteTime * 1000, { long: true })}\` old`
                : ''
            }.`
          );

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Parallel', iconURL: this.client.user!.displayAvatarURL() })
        .setTitle(command.name)
        .setColor(mainColor);

      let description = `${command.description}\n\n`;
      if (command.NA) description += '***• This command is only available via slash commands!***\n';
      if (command.args)
        description += `**•** *Usage: \`${command.args.map(way => `/${command.name} ${way}`).join('\n')}\`*\n`;
      if (command.aliases.length > 0)
        description += `**•** *Aliases: ${command.aliases.map(alias => `\`${alias}\``).join(', ')}*\n`;
      if (command.allowDM) description += `**•** *This command can be ran in DM's.*`;

      embed.setDescription(description);

      return interaction.reply({ embeds: [embed] });
    }

    const shortcuts = interaction.inGuild()
      ? (await this.client.db.shortcut.findMany({ where: { guildId: interaction.guildId } }))!
      : null;

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Parallel', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle('Command List')
      .setColor(mainColor)
      .setDescription([...this.client.commands.message.values()].map(cmd => `\`${cmd.name}\``).join(', '));

    if (shortcuts && shortcuts.length !== 0)
      embed.addFields({
        name: 'Shortcuts',
        value: shortcuts.map(shortcut => `\`${shortcut.name}\``).join(', ')
      });

    return interaction.reply({ embeds: [embed] });
  }
}

export default HelpCommand;
