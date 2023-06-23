import { InfractionType } from '@prisma/client';
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { data } from '../lib/structs/Command';
import { mainColor } from '../lib/util/constants';
import { bin } from '../lib/util/functions';
import { AppealResponse } from '../types';

@data(
  new SlashCommandBuilder()
    .setName('appeal-manager')
    .setDescription('Manage infraction appeals.')
    .setDefaultMemberPermissions(Permissions.Administrator)
    .addSubcommand(command =>
      command
        .setName('view')
        .setDescription('View an appeal for an infraction.')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The infraction ID for the infraction appeal you are viewing (use /myinfractions to find.)')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(command =>
      command
        .setName('disregard')
        .setDescription('Disregard an appeal for an infraction (not the same as denying.)')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The infraction ID for the infraction appeal you are disregarding.')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(command =>
      command
        .setName('accept')
        .setDescription('Accept an appeal for an infraction.')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The infraction ID for the infraction appeal you are accepting.')
            .setMinValue(1)
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('The reason for acceptance.').setMaxLength(1000)
        )
        .addBooleanOption(option =>
          option.setName('dont-undo').setDescription("Don't automatically undo the correlated punishment.")
        )
    )
    .addSubcommand(command =>
      command
        .setName('deny')
        .setDescription('Deny an appeal for an infraction.')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The infraction ID for the infraction appeal you are denying.')
            .setMinValue(1)
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('The reason for acceptance.').setMaxLength(1000)
        )
    )
    .addSubcommand(command =>
      command.setName('view-pending').setDescription('Get the ID of all infractions with a pending appeal.')
    )
    .addSubcommandGroup(group =>
      group
        .setName('blacklist')
        .setDescription('Manage the users blacklisted from creating new appeals.')
        .addSubcommand(command =>
          command
            .setName('add')
            .setDescription('Add a user to the blacklist.')
            .addUserOption(option =>
              option.setName('user').setDescription('The user to add to the blacklist.').setRequired(true)
            )
        )
        .addSubcommand(command =>
          command
            .setName('remove')
            .setDescription('Remove a user from the blacklist.')
            .addUserOption(option =>
              option.setName('user').setDescription('The user to remove from the blacklist.').setRequired(true)
            )
        )
        .addSubcommand(command => command.setName('clear').setDescription('Remove all users from the blacklist.'))
        .addSubcommand(command => command.setName('view').setDescription('View the blacklist.'))
    )
)
class AppealManagerCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id')!;
    const dontUndo = interaction.options.getBoolean('dont-undo') ?? false;
    const reason = interaction.options.getString('reason') ?? undefined;
    const command = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup();

    if (group === 'blacklist') {
      const user = interaction.options.getUser('user')!;

      const { appealBlacklist } = (await this.client.db.guild.findUnique({
        where: {
          id: interaction.guildId
        },
        select: {
          appealBlacklist: true
        }
      }))!;

      switch (command) {
        case 'add':
          if (appealBlacklist.includes(user.id)) throw 'That user is already blacklisted from creating appeals.';

          await this.client.db.guild.update({
            where: {
              id: interaction.guildId
            },
            data: {
              appealBlacklist: {
                push: user.id
              }
            }
          });

          return interaction.reply(`Blacklisted ${user} from creating appeals.`);
        case 'remove':
          if (!appealBlacklist.includes(user.id)) throw "That user isn't blacklisted from creating appeals.";

          appealBlacklist.splice(appealBlacklist.indexOf(user.id), 1);

          await this.client.db.guild.update({
            where: {
              id: interaction.guildId
            },
            data: {
              appealBlacklist
            }
          });
          return interaction.reply(`${user} has been removed from the blacklist.`);
        case 'view':
          return interaction.reply(
            `View the blacklist here: ${await bin(
              `Total blacklists: ${appealBlacklist.length}\n\n${appealBlacklist.join('\n')}`
            )}`
          );
        case 'clear':
          await this.client.db.guild.update({
            where: {
              id: interaction.guildId
            },
            data: {
              appealBlacklist: []
            }
          });

          return interaction.reply('Appeal blacklist has been cleared.');
      }

      return;
    }

    if (command === 'view-pending') {
      const ids = await this.client.db.appeal.findMany({
        where: {
          guildId: interaction.guildId
        }
      });

      if (ids.length == 0) return interaction.reply('There are no pending appeals.');

      if (ids.length > 50) {
        const url = await bin(ids.map(id => `${id.id} - ${id.userId}`).join('\n'));
        return interaction.reply(`View all infraction ID\'s with a pending appeal: ${url}`);
      }

      return interaction.reply(
        `Below displays the ID's of all infractions with a pending appeal.\n\`\`\`\n${ids
          .map(id => `${id.id} - ${id.userId}`)
          .join('\n')}\`\`\``
      );
    }

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { appeal: true, guild: { select: { notifyInfractionChange: true } } }
    });

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists in this guild.';
    if (!infraction.appeal) throw 'That infraction does not have an appeal.';

    const { appeal } = infraction;

    switch (command) {
      case 'view':
        let embedDescription = '';
        embedDescription += `**Infraction ID:** ${appeal.id}\n**Infraction Type:** ${infraction.type.toString()}\n\n`;
        embedDescription += (appeal.response as AppealResponse)
          .map((field: any) => `Question: ${field.question}\nResponse: ${field.response}`)
          .join('\n\n');

        const user = (await this.client.users.fetch(appeal.userId))!;

        const viewEmbed = new EmbedBuilder()
          .setColor(mainColor)
          .setAuthor({
            name: `Infraction appeal from ${user.username} (${user.id})`,
            iconURL: user.displayAvatarURL()
          })
          .setDescription(embedDescription)
          .setFooter({ text: `Use /case id:${infraction.id} to get context.` })
          .setTimestamp();

        return interaction.reply({ embeds: [viewEmbed] });
      case 'disregard':
        await this.client.db.appeal.delete({
          where: {
            id
          }
        });

        return interaction.reply(`Appeal disregarded.`);
      case 'accept':
        switch (infraction.type) {
          case InfractionType.Ban:
            if (!interaction.guild.members.me!.permissions.has(Permissions.BanMembers))
              throw "I cannot undo the punishment because I do not have the Ban Members permission. If you don't want to undo the punishment, set the `dont-undo` option to `True`";
            await interaction.guild.members.unban(infraction.userId, reason).catch(() => {
              throw 'That member is not banned. Set the `dont-undo` option to `True` to accept.';
            });
            break;
          case InfractionType.Mute:
            if (!interaction.guild.members.me!.permissions.has(Permissions.ModerateMembers))
              throw "I cannot undo the punishment because I do not have the Moderate Members permission. If you don't want to undo the punishment, set the `dont-undo` option to `True` to accept.";
            await interaction.guild.members
              .fetch(infraction.userId)
              .then(member => member.timeout(null, reason))
              .catch(() => {
                throw 'I could not undo the punishment because the member is not in the guild. Set the `dont-undo` option to `True` to accept.';
              });
            break;
        }

        await interaction.deferReply();

        await this.client.db.appeal.delete({
          where: {
            id
          }
        });

        await this.client.db.infraction.delete({
          where: {
            id
          }
        });

        if (dontUndo && infraction.type !== InfractionType.Ban && infraction.type !== InfractionType.Mute)
          throw 'There is no punishment to avoid un-doing.';

        const acceptEmbed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle('Appeal Accepted')
          .setColor(Colors.Green)
          .setDescription(
            `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
              reason ? `\n${reason}` : ''
            }${dontUndo ? '\n\n***•** The correlated punishment to this appeal was not automatically removed.*' : ''}`
          );

        if (infraction.guild.notifyInfractionChange)
          await this.client.users
            .fetch(appeal.userId)
            .then(user => user.send({ embeds: [acceptEmbed] }))
            .catch(() => {});

        return interaction.editReply('Appeal accepted.');
      case 'deny':
        await this.client.db.appeal.delete({
          where: {
            id
          }
        });

        const denyEmbed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle('Appeal Denied')
          .setColor(Colors.Red)
          .setDescription(
            `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
              reason ? `\n${reason}` : ''
            }`
          );

        if (infraction.guild.notifyInfractionChange)
          await this.client.users
            .fetch(appeal.userId)
            .then(user => user.send({ embeds: [denyEmbed] }))
            .catch(() => {});

        return interaction.reply('Appeal denied.');
    }
  }
}

export default AppealManagerCommand;
