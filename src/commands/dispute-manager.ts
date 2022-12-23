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
import { DisputeResponse } from '../types';

/*
 * /dispute view [id]
 * /dispute disregard [id]
 * /dispute accept [id] [reason]? [dont-undo]?
 * /dispute deny [id] [reason]?
 * /dispute blacklist add [user-id] [reason]?
 * /dispute blacklist remove [user-id]
 * /dispute blacklist clear
 * /dispute blacklist view
 */
@data(
  new SlashCommandBuilder()
    .setName('dispute-manager')
    .setDescription('Manage infraction disputes.')
    .setDefaultMemberPermissions(Permissions.Administrator)
    .addSubcommand(command =>
      command
        .setName('view')
        .setDescription('View a dispute for an infraction.')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription(
              'The infraction ID for the infraction dispute you are viewing (use /myinfractions to find.)'
            )
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(command =>
      command
        .setName('disregard')
        .setDescription('Disregard a dispute for an infraction (not the same as denying.)')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The infraction ID for the infraction dispute you are disregarding.')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(command =>
      command
        .setName('accept')
        .setDescription('Accept a dispute for an infraction.')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The infraction ID for the infraction dispute you are accepting.')
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
        .setDescription('Deny a dispute for an infraction.')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The infraction ID for the infraction dispute you are denying.')
            .setMinValue(1)
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('The reason for acceptance.').setMaxLength(1000)
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('blacklist')
        .setDescription('Manage the users blacklisted from creating new disputes.')
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
class DisputeManagerCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id')!;
    const dontUndo = interaction.options.getBoolean('dont-undo') ?? false;
    const reason = interaction.options.getString('reason') ?? undefined;
    const command = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup();

    if (group === 'blacklist') {
      const user = interaction.options.getUser('user')!;

      const { disputeBlacklist } = (await this.client.db.guild.findUnique({
        where: {
          id: interaction.guildId
        },
        select: {
          disputeBlacklist: true
        }
      }))!;

      switch (command) {
        case 'add':
          if (disputeBlacklist.includes(user.id)) throw 'That user is already blacklisted from creating disputes.';

          await this.client.db.guild.update({
            where: {
              id: interaction.guildId
            },
            data: {
              disputeBlacklist: {
                push: user.id
              }
            }
          });

          return interaction.reply(`Blacklisted ${user} from creating disputes.`);
        case 'remove':
          if (!disputeBlacklist.includes(user.id)) throw "That user isn't blacklisted from creating disputes.";

          disputeBlacklist.splice(disputeBlacklist.indexOf(user.id), 1);

          await this.client.db.guild.update({
            where: {
              id: interaction.guildId
            },
            data: {
              disputeBlacklist
            }
          });
          return interaction.reply(`${user} has been removed from the blacklist.`);
        case 'view':
          return interaction.reply(
            `View the blacklist here: ${await bin(
              `Total blacklists: ${disputeBlacklist.length}\n\n${disputeBlacklist.join('\n')}`
            )}`
          );
        case 'clear':
          await this.client.db.guild.update({
            where: {
              id: interaction.guildId
            },
            data: {
              disputeBlacklist: []
            }
          });

          return interaction.reply('Dispute blacklist has been cleared.');
      }

      return;
    }

    const dispute = await this.client.db.dispute.findUnique({
      where: {
        id
      },
      include: { infraction: true, guild: { select: { notifyInfractionChange: true } } }
    });

    if (!dispute) throw 'That infraction does not have dispute.';
    const infraction = dispute.infraction!;

    switch (command) {
      case 'view':
        let embedDescription = '';
        embedDescription += `**Infraction ID:** ${dispute.id}\n**Infraction Type:** ${infraction.type.toString()}\n\n`;
        embedDescription += (dispute.response as DisputeResponse)
          .map((field: any) => `Question: ${field.question}\nResponse: ${field.response}`)
          .join('\n\n');

        const user = (await this.client.users.fetch(dispute.userId))!;

        const viewEmbed = new EmbedBuilder()
          .setColor(mainColor)
          .setAuthor({
            name: `Infraction dispute from ${user.tag} (${user.id})`,
            iconURL: user.displayAvatarURL()
          })
          .setDescription(embedDescription)
          .setFooter({ text: `Use /case id:${infraction.id} to get context.` })
          .setTimestamp();

        return interaction.reply({ embeds: [viewEmbed] });
      case 'disregard':
        await this.client.db.dispute.delete({
          where: {
            id
          }
        });

        return interaction.reply(`Dispute disregarded.`);
      case 'accept':
        await interaction.deferReply();

        await this.client.db.dispute.delete({
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

        const acceptEmbed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle('Dispute Accepted')
          .setColor(Colors.Green)
          .setDescription(
            `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
              reason ? `\n${reason}` : ''
            }${dontUndo ? '\n\n***•** The correlated punishment to this dispute was not automatically removed.*' : ''}`
          );

        if (dispute.guild.notifyInfractionChange)
          await this.client.users
            .fetch(dispute.userId)
            .then(user => user.send({ embeds: [acceptEmbed] }))
            .catch(() => {});

        return interaction.editReply('Dispute accepted.');
      case 'deny':
        await this.client.db.dispute.delete({
          where: {
            id
          }
        });

        const denyEmbed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle('Dispute Denied')
          .setColor(Colors.Red)
          .setDescription(
            `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
              reason ? `\n${reason}` : ''
            }`
          );

        if (dispute.guild.notifyInfractionChange)
          await this.client.users
            .fetch(dispute.userId)
            .then(user => user.send({ embeds: [denyEmbed] }))
            .catch(() => {});

        return interaction.reply('Dispute denied.');
    }
  }
}

export default DisputeManagerCommand;
