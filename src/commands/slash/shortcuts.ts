import { InfractionType as IT } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ApplicationCommandOptionType as OptionType,
  EmbedBuilder
} from 'discord.js';
import ms from 'ms';
import Command, { data } from '../../lib/structs/Command';
import { d28, mainColor } from '../../lib/util/constants';
import { bin } from '../../lib/util/functions';
const nameReg = /^[\p{Ll}\p{Lm}\p{Lo}\p{N}\p{sc=Devanagari}\p{sc=Thai}_-]+$/u;

@data(
  new SlashCommandBuilder()
    .setName('shortcuts')
    .setDescription('Manage the shortcuts on this guild.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(command =>
      command
        .setName('create')
        .setDescription('Create a punishment shortcut')
        .addStringOption(option =>
          option.setName('name').setDescription('The name of the shortcut.').setMaxLength(30).setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('The description of the shortcut')
            .setMaxLength(100)
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('punishment')
            .setDescription('The punishment command.')
            .setRequired(true)
            .addChoices(
              { name: 'Warn', value: IT.Warn },
              { name: 'Mute', value: IT.Mute },
              { name: 'Kick', value: IT.Kick },
              { name: 'Ban', value: IT.Ban },
              { name: 'Unmute', value: IT.Unmute },
              { name: 'Unban', value: IT.Unban }
            )
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('The reason for the punishment.').setMaxLength(1000).setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration').setDescription('Duration for the punishment.').setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('delete-previous-messages')
            .setDescription('Delete messages sent in past...')
            .addChoices(
              { name: 'Previous hour', value: '1h' },
              { name: 'Previous 6 hours', value: '6h' },
              { name: 'Previous 12 hours', value: '12h' },
              { name: 'Previous 24 hours', value: '24h' },
              { name: 'Previous 3 days', value: '3d' },
              { name: 'Previous 7 days', value: '7d' }
            )
        )
    )
    .addSubcommand(command =>
      command
        .setName('delete')
        .setDescription('Delete a shortcut.')
        .addStringOption(option => option.setName('name').setDescription('Name of the shortcut.').setRequired(true))
    )
    .addSubcommand(command => command.setName('view').setDescription('View all shortcuts.'))
    .addSubcommand(command =>
      command
        .setName('get')
        .setDescription('Get information on a shortcut.')
        .addStringOption(option => option.setName('name').setDescription('The name of the shortcut').setRequired(true))
    )
)
class ShortcutsCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const sc = interaction.options.getSubcommand();

    if (sc === 'create') {
      const name = interaction.options.getString('name', true);
      if (!name.match(nameReg))
        throw 'The provided name contains illegal characters. Try limiting the name to letters, numbers, and dashes.';

      const alreadyACommand = this.client.commands.slash.has(name) || this.client.aliases.has(name);
      if (alreadyACommand) throw 'Shortcut name cannot match built in command names.';

      const description = interaction.options.getString('description', true);
      const punishment = interaction.options.getString('punishment', true) as IT;
      const reason = interaction.options.getString('reason', true);
      const uDuration = interaction.options.getString('duration');
      const uDeleteTime = interaction.options.getString('delete-previous-messages');

      for (const key in this.client.commands.slash.keys())
        if (key === name) throw 'You cannot create a shortcut with the name of a command.';

      if (uDuration && (punishment === IT.Unmute || punishment === IT.Unban || punishment === IT.Kick))
        throw 'You cannot provide a duration for this kind of punishment.';
      if (uDeleteTime && punishment !== IT.Ban)
        throw 'You cannot provide a value for the `delete-previous-messages` option for this kind of punishment.';

      const duration = uDuration ? +uDuration * 1000 || ms(uDuration) : null;
      const deleteTime = uDeleteTime ? ms(uDeleteTime) / 1000 : null;

      if (uDuration && !duration && duration !== 0) throw 'Invalid duration.';
      if (duration && duration < 1000) throw 'Duration must be at least 1 second.';
      if (!duration && punishment === IT.Mute) throw 'A duration must be provided for type `mute`.';
      if (punishment === IT.Mute && duration! > d28)
        throw 'The duration cannot be over 28 days for the mute punishment.';

      const count = await this.client.db.shortcut.count({
        where: {
          guildId: interaction.guildId
        }
      });

      if (count >= 100) throw 'You cannot create more than 100 shortcuts.';

      const exists = await this.client.db.shortcut.findUnique({
        where: {
          guildId_name: { guildId: interaction.guildId, name }
        }
      });

      if (exists) throw 'A shortcut with that name already exists.';

      await interaction.deferReply();

      const cmd = await interaction.guild.commands
        .create({
          name,
          description,
          defaultMemberPermissions:
            punishment === IT.Ban || punishment === IT.Unban
              ? PermissionFlagsBits.BanMembers
              : punishment === IT.Mute || punishment === IT.Unmute
              ? PermissionFlagsBits.MuteMembers
              : punishment === IT.Kick
              ? PermissionFlagsBits.KickMembers
              : PermissionFlagsBits.ModerateMembers,
          options: [
            {
              name: punishment === IT.Ban || punishment === IT.Unban ? 'user' : 'member',
              description: `The ${
                punishment === IT.Ban || punishment === IT.Unban ? 'user' : 'member'
              } to ${punishment.toLowerCase()}.`,
              type: OptionType.User,
              required: true
            }
          ]
        })
        .catch(() => {
          throw 'Error creating command.';
        });

      await this.client.db.shortcut.create({
        data: {
          guildId: interaction.guildId,
          id: cmd.id,
          name,
          description,
          punishment,
          reason,
          duration: duration ? BigInt(duration) : undefined,
          deleteTime
        }
      });

      return interaction.editReply('Shortcut created.');
    } else if (sc === 'delete') {
      const name = interaction.options.getString('name', true);

      await interaction.deferReply();
      const worked = await this.client.db.shortcut
        .delete({
          where: {
            guildId_name: { guildId: interaction.guildId, name }
          }
        })
        .catch(() => false);

      if (!worked) throw 'Shortcut does not exist.';

      const command = interaction.guild.commands.cache.find(c => c.name === name)?.id;
      if (command) interaction.guild.commands.delete(command);

      return interaction.editReply('Shortcut deleted.');
    } else if (sc === 'view') {
      const shortcuts = await this.client.db.shortcut.findMany({
        where: {
          guildId: interaction.guildId
        }
      });

      if (shortcuts.length === 0) return interaction.reply('This guild has no shortcuts.');

      await interaction.deferReply();

      const shortcutMap = shortcuts.map(cut => cut.name).join(', ');

      if (shortcutMap.length < 1000) {
        const embed = new EmbedBuilder().setTitle('Guild Shortcuts').setDescription(shortcutMap).setColor(mainColor);

        return interaction.editReply({ embeds: [embed] });
      } else {
        const url = await bin(shortcuts.join('\n'));
        return interaction.editReply(`Here are the shortcuts: ${url}`);
      }
    } else if (sc === 'get') {
      const name = interaction.options.getString('name', true);

      const shortcut = await this.client.db.shortcut.findUnique({
        where: {
          guildId_name: {
            guildId: interaction.guildId,
            name
          }
        }
      });

      if (!shortcut) throw 'No shortcut with that name exists.';

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
  }
}

export default ShortcutsCommand;
