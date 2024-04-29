import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonStyle,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { bin, createComplexCustomId } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('ticket-manager')
    .setDescription('Manage ticket configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(cmd =>
      cmd
        .setName('enabled')
        .setDescription('Allow new tickets to be created.')
        .addBooleanOption(opt => opt.setName('value').setDescription('Toggle for this setting').setRequired(true))
    )
    .addSubcommandGroup(group =>
      group
        .setName('log-channel')
        .setDescription('Log deleted tickets in a designated channel.')
        .addSubcommand(cmd =>
          cmd
            .setName('set')
            .setDescription('Choose a channel to log tickets in.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to log tickets in.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(cmd => cmd.setName('none').setDescription('Disable ticket logging.'))
    )
    .addSubcommand(cmd =>
      cmd
        .setName('location')
        .setDescription('The category where new tickets are created.')
        .addChannelOption(opt =>
          opt
            .setName('category')
            .setDescription('The category.')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand(cmd =>
      cmd
        .setName('allow_user_close')
        .setDescription('Allow users to close tickets they created.')
        .addBooleanOption(opt => opt.setName('value').setDescription('Toggle for this setting').setRequired(true))
    )
    .addSubcommand(cmd =>
      cmd
        .setName('auto_moderation_enabled')
        .setDescription('Enforce auto moderation in tickets.')
        .addBooleanOption(opt => opt.setName('value').setDescription('Toggle for this setting').setRequired(true))
    )
    .addSubcommandGroup(group =>
      group
        .setName('ping_role_on_creation')
        .setDescription('Ping a role when a ticket is created.')
        .addSubcommand(cmd =>
          cmd
            .setName('set')
            .setDescription('Choose a role to ping.')
            .addRoleOption(opt => opt.setName('role').setDescription('The role to ping.').setRequired(true))
        )
        .addSubcommand(cmd => cmd.setName('none').setDescription('Disable role pinging.'))
    )
    .addSubcommandGroup(group =>
      group
        .setName('moderator_roles')
        .setDescription('Manage roles that can moderate tickets.')
        .addSubcommand(cmd =>
          cmd
            .setName('add')
            .setDescription('Add a role to the list.')
            .addRoleOption(opt => opt.setName('role').setDescription('The role.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('remove')
            .setDescription('Remove a role from the list.')
            .addRoleOption(opt => opt.setName('role').setDescription('The role.').setRequired(true))
        )
        .addSubcommand(cmd => cmd.setName('view').setDescription('View the list of moderator roles.'))
    )
    .addSubcommandGroup(group =>
      group
        .setName('blacklist')
        .setDescription('Manage the users blacklisted from creating new tickets.')
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
    .addSubcommand(cmd =>
      cmd
        .setName('add_create_ticket_button')
        .setDescription('Add a create ticket button. It will be created in the channel you run this command.')
        .addStringOption(opt => opt.setName('button_label').setDescription('The label of the button.'))
        .addStringOption(opt =>
          opt
            .setName('button_color')
            .setDescription('The color of the button.')
            .addChoices(
              { name: 'Red', value: ButtonStyle.Danger.toString() },
              { name: 'Green', value: ButtonStyle.Success.toString() },
              { name: 'Blue', value: ButtonStyle.Primary.toString() },
              { name: 'Gray', value: ButtonStyle.Secondary.toString() }
            )
        )
    )
)
class TicketManagerCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const group = interaction.options.getSubcommandGroup();
    const subCmd = interaction.options.getSubcommand();

    if (group) {
      switch (group) {
        case 'log-channel': {
          if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.ManageWebhooks))
            throw 'I need permission to manage webhooks.';

          const { ticketLogWebhookURL } = (await this.client.db.guild.findUnique({
            where: { id: interaction.guildId }
          }))!;

          switch (subCmd) {
            case 'set': {
              const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText]);
              await interaction.deferReply();

              const webhooks = await interaction.guild.fetchWebhooks();
              const webhook = webhooks.find(wh => wh.url === ticketLogWebhookURL);

              if (webhook) {
                if (webhook.channel!.id === channel.id) throw 'Ticket log channel is already set to that channel.';

                await webhook
                  .edit({
                    channel: channel.id
                  })
                  .catch(() => {
                    throw 'Failed to change log channel likely due to permissions.';
                  });
              } else {
                const newWebhook = await channel.createWebhook({
                  name: 'Ticket Logger',
                  avatar: this.client.user!.displayAvatarURL()
                });

                await this.client.db.guild
                  .update({
                    where: {
                      id: interaction.guildId
                    },
                    data: {
                      ticketLogWebhookURL: newWebhook.url
                    }
                  })
                  .catch(() => {
                    throw 'Failed to set log channel likely due to permissions.';
                  });
              }

              return interaction.editReply(`Ticket log channel set to ${channel.toString()}.`);
            }
            case 'none': {
              if (!ticketLogWebhookURL) return interaction.reply('Ticket logging disabled.');
              await interaction.deferReply();
              await this.client.deleteWebhook(ticketLogWebhookURL).catch(() => {});
              return interaction.editReply('Ticket logging disabled.');
            }
          }
        }
        case 'ping_role_on_creation': {
          switch (subCmd) {
            case 'set': {
              const role = interaction.options.getRole('role', true);
              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { pingRoleOnTicketCreation: role.id }
              });

              return interaction.reply(`The role ${role.toString()} will now be pinged when a ticket is created.`);
            }
            case 'none': {
              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { pingRoleOnTicketCreation: null }
              });

              return interaction.reply('A role will not be pinged when a ticket is created.');
            }
          }
        }
        case 'moderator_roles': {
          const { ticketModeratorRoles } = (await this.client.db.guild.findUnique({
            where: { id: interaction.guildId },
            select: { ticketModeratorRoles: true }
          }))!;

          switch (subCmd) {
            case 'add': {
              const role = interaction.options.getRole('role', true);
              if (ticketModeratorRoles.includes(role.id)) throw 'That role is already a ticket moderator.';

              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { ticketModeratorRoles: { push: role.id } }
              });

              return interaction.reply(`${role.toString()} is now a ticket moderator role.`);
            }
            case 'remove': {
              const role = interaction.options.getRole('role', true);
              if (!ticketModeratorRoles.includes(role.id)) throw 'That role is not a ticket moderator.';
              ticketModeratorRoles.splice(ticketModeratorRoles.indexOf(role.id), 1);

              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { ticketModeratorRoles }
              });

              return interaction.reply(`${role.toString()} is no longer a ticket moderator role.`);
            }
            case 'view': {
              const list = ticketModeratorRoles.map(r => `<@&${r}>`).join(', ');
              if (list.length > 2000)
                return interaction.editReply(
                  `Too long to upload as a Discord message, view here: ${await bin(ticketModeratorRoles.join('\n'))}`
                );

              if (list.length === 0) return interaction.reply('There are no ticket moderator roles.');

              return interaction.reply(list);
            }
          }
        }
        case 'blacklist': {
          const { ticketBlacklist } = (await this.client.db.guild.findUnique({
            where: { id: interaction.guildId },
            select: { ticketBlacklist: true }
          }))!;

          switch (subCmd) {
            case 'add': {
              const user = interaction.options.getUser('user', true);
              if (ticketBlacklist.includes(user.id)) throw 'That user is already on the blacklist';

              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { ticketBlacklist: { push: user.id } }
              });

              return interaction.reply(`${user.toString()} is now blacklisted from creating new tickets.`);
            }
            case 'remove': {
              const user = interaction.options.getUser('user', true);
              if (!ticketBlacklist.includes(user.id)) throw 'That user is not on the blacklist.';
              ticketBlacklist.splice(ticketBlacklist.indexOf(user.id), 1);

              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { ticketBlacklist }
              });

              return interaction.reply(`${user.toString()} is no longer blacklisted from creating new tickets.`);
            }
            case 'clear': {
              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { ticketBlacklist: [] }
              });

              return interaction.reply('The ticket blacklist has been cleared.');
            }
            case 'view': {
              const list = ticketBlacklist.map(u => `<@${u}>`).join(', ');
              if (list.length > 2000)
                return interaction.editReply(
                  `Too long to upload as a Discord message, view here: ${await bin(ticketBlacklist.join('\n'))}`
                );

              if (list.length === 0) return interaction.reply('There are no users on the ticket blacklist.');

              return interaction.reply(list);
            }
          }
        }
      }
    }

    switch (subCmd) {
      case 'enabled': {
        const value = interaction.options.getBoolean('value', true);
        await this.client.db.guild.update({
          where: { id: interaction.guildId },
          data: { ticketsEnabled: value }
        });

        return interaction.reply(`Tickets are now ${value === true ? 'enabled' : 'disabled'}.`);
      }
      case 'allow_user_close': {
        const value = interaction.options.getBoolean('value', true);
        await this.client.db.guild.update({
          where: { id: interaction.guildId },
          data: { allowUserCloseTicket: value }
        });

        if (value === true) return interaction.reply('Users may now close their own tickets.');
        else return interaction.reply('Users may no longer close their own tickets.');
      }
      case 'auto_moderation_enabled': {
        const value = interaction.options.getBoolean('value', true);
        await this.client.db.guild.update({
          where: { id: interaction.guildId },
          data: { ticketAutoModeration: value }
        });

        if (value === true) return interaction.reply('Auto moderation is now being enforced in tickets.');
        else return interaction.reply('Auto moderation is no longer being enforecd in tickets.');
      }
      case 'location': {
        const category = interaction.options.getChannel('category', true, [ChannelType.GuildCategory]);
        await this.client.db.guild.update({
          where: { id: interaction.guildId },
          data: { ticketLocation: category.id }
        });

        return interaction.reply(`Tickets will now be created in ${category.toString()}`);
      }
      case 'add_create_ticket_button': {
        const buttonLabel = interaction.options.getString('button_label') ?? 'Create Ticket';
        const buttonColor = interaction.options.getString('button_color') ?? ButtonStyle.Primary.toString();

        if (buttonLabel.length > 80) throw 'Button label is too long.';

        const modal = new ModalBuilder()
          .setTitle('Create Ticket Message')
          .setCustomId(createComplexCustomId('ticket-hyperlink', null, [buttonLabel, buttonColor]));
        const descriptionRow = new ActionRowBuilder<TextInputBuilder>();
        const descriptionComponent = new TextInputBuilder()
          .setCustomId('description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(2000)
          .setRequired(true);

        descriptionRow.addComponents(descriptionComponent);
        modal.addComponents(descriptionRow);

        return interaction.showModal(modal);
      }
    }
  }
}

export default TicketManagerCommand;
