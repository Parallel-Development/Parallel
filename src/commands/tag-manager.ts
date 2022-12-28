import { ActionRowBuilder, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  TextInputStyle
} from 'discord.js';
import Command, { data } from '../lib/structs/Command';
import { bin } from '../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('tag-manager')
    .setDescription('Manage tags in the guild. Tags are (typically) informational text that can be referenced.')
    .setDefaultMemberPermissions(Permissions.ManageGuild)
    .addSubcommand(command =>
      command
        .setName('create')
        .setDescription('Create a new tag.')
        .addStringOption(option =>
          option.setName('name').setDescription('The name of the tag.').setRequired(true).setMaxLength(30)
        )
    )
    .addSubcommand(command =>
      command
        .setName('delete')
        .setDescription('Delete a tag.')
        .addStringOption(option => option.setName('name').setDescription('The name of the tag.').setRequired(true))
    )
    .addSubcommand(command =>
      command
        .setName('rename')
        .setDescription('Rename a tag.')
        .addStringOption(option =>
          option.setName('name').setDescription('The name of the tag you are renaming.').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('new-name').setDescription('The new name of the tag.').setMaxLength(1000).setRequired(true)
        )
    )
    .addSubcommand(command =>
      command
        .setName('edit')
        .setDescription('Change the content of a tag.')
        .addStringOption(option => option.setName('name').setDescription('The name of the tag.').setRequired(true))
    )
    .addSubcommand(command => command.setName('view').setDescription('View all tags.'))
)
class TagManagerCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    switch (interaction.options.getSubcommand(true)) {
      case 'create': {
        const name = interaction.options.getString('name', true).toLowerCase();

        const exists = await this.client.db.tag.findUnique({
          where: {
            guildId_name: { guildId: interaction.guildId, name }
          }
        });

        if (exists) throw 'A tag with that name already exists.';

        const modal = new ModalBuilder().setTitle('Create a new tag').setCustomId('tag-manager:create');

        const nameRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
        const nameQ = new TextInputBuilder()
          .setLabel('name')
          .setCustomId('name')
          .setMaxLength(30)
          .setRequired(true)
          .setValue(name)
          .setStyle(TextInputStyle.Short);

        nameRow.setComponents(nameQ);

        const contentRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
        const contentQ = new TextInputBuilder()
          .setLabel('content')
          .setCustomId('content')
          .setMaxLength(1000)
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph);

        contentRow.setComponents(contentQ);

        modal.addComponents(nameRow, contentRow);

        interaction.showModal(modal);
        break;
      }
      case 'delete': {
        const name = interaction.options.getString('name', true);
        const deleted = await this.client.db.tag.deleteMany({
          where: {
            guildId: interaction.guildId,
            name
          }
        });

        if (deleted.count === 0) throw 'Tag does not exist.';

        return interaction.reply('Tag deleted.');
      }
      case 'rename': {
        const name = interaction.options.getString('name', true).toLowerCase();
        const newName = interaction.options.getString('new-name', true).toLowerCase();

        await this.client.db.tag
          .update({
            where: {
              guildId_name: { guildId: interaction.guildId, name }
            },
            data: {
              name: newName
            }
          })
          .catch(() => {
            throw 'Tag does not exist.';
          });

        return interaction.reply(`Tag renamed to \`${newName}\``);
      }
      case 'edit': {
        const name = interaction.options.getString('name', true).toLowerCase();

        const exists = await this.client.db.tag.findUnique({
          where: {
            guildId_name: { guildId: interaction.guildId, name }
          }
        });

        if (!exists) throw 'Tag does not exist.';

        const modal = new ModalBuilder().setTitle('Edit tag').setCustomId('tag-manager:edit');

        const nameRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
        const nameQ = new TextInputBuilder()
          .setLabel('name')
          .setCustomId('name')
          .setMaxLength(30)
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
          .setValue(name);

        nameRow.setComponents(nameQ);

        const contentRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
        const contentQ = new TextInputBuilder()
          .setLabel('content')
          .setCustomId('content')
          .setMaxLength(1000)
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph);

        contentRow.setComponents(contentQ);

        modal.addComponents(nameRow, contentRow);

        interaction.showModal(modal);
        break;
      }
      case 'view': {
        const tags = await this.client.db.tag.findMany({
          where: {
            guildId: interaction.guildId
          }
        });

        if (tags.length === 0) return interaction.reply('This guild has no tags.');

        const tagMap = tags.map(tag => tag.name);

        if (tags.length > 30) {
          await interaction.deferReply();
          const out = await bin('GUILD TAGS\n\n' + tagMap.join('\n'));
          return interaction.editReply(`Here's the list of tags: ${out}`);
        }

        return interaction.reply(`\`\`\`\n${tagMap.join(', ')}\`\`\``);
      }
    }
  }
}

export default TagManagerCommand;
