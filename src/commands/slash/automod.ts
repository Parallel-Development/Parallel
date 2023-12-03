import { InfractionType } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  Role,
  ChannelType,
  AutoModerationRuleTriggerType,
  AutoModerationRuleEventType,
  AutoModerationActionType
} from 'discord.js';
import ms from 'ms';
import Command, { data } from '../../lib/structs/Command';
import { AutoModSpamTriggers } from '../../types';
import { bin } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage the automod configuration.')
    .setDefaultMemberPermissions(Permissions.ManageGuild)
    .addSubcommand(cmd => cmd.setName('view').setDescription('View the automod settings.'))
    .addSubcommand(cmd =>
      cmd
        .setName('toggle')
        .setDescription('Toggle an automod module.')
        .addStringOption(option =>
          option
            .setName('module')
            .setDescription('The automod module.')
            .setRequired(true)
            .addChoices(
              { name: 'Spam', value: 'autoModSpamToggle' },
              { name: 'Malicious Links', value: 'autoModMaliciousToggle' },
              { name: 'Filter', value: 'autoModFilterToggle' }
            )
        )
        .addBooleanOption(opt =>
          opt.setName('toggle').setDescription('True for enabled, False for disabled.').setRequired(true)
        )
    )
    .addSubcommand(cmd =>
      cmd
        .setName('punishment')
        .setDescription('The punishment for violating an automod rule.')
        .addStringOption(option =>
          option.setName('module').setDescription('The automod module.').setRequired(true).addChoices(
            // "Punishment" and "Duration" will be manually appended to modify those values. "autoModSpam" is not a valid module name itself.
            { name: 'Spam', value: 'autoModSpam' },
            { name: 'Malicious Links', value: 'autoModMalicious' },
            { name: 'Filter', value: 'autoModFilter' }
          )
        )
        .addStringOption(opt =>
          opt
            .setName('punishment')
            .setDescription('The punishment to give.')
            .setRequired(true)
            .addChoices(
              { name: 'Delete', value: 'delete' },
              { name: 'Warn', value: InfractionType.Warn },
              { name: 'Mute', value: InfractionType.Mute },
              { name: 'Kick', value: InfractionType.Kick },
              { name: 'Ban', value: InfractionType.Ban }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('duration')
            .setDescription(
              'The duration of the punishment. Required for punishment `Mute`. Not allowed for `Delete` or `Kick`.'
            )
            .setAutocomplete(true)
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('immunity')
        .setDescription('Manage the immunity for roles and channels for different automod modules.')
        .addSubcommand(cmd =>
          cmd
            .setName('roles-add')
            .setDescription('Make a role immune to an automod module.')
            .addRoleOption(opt => opt.setName('role').setDescription('The role to make immune.').setRequired(true))
            .addStringOption(opt =>
              opt
                .setName('module')
                .setDescription('The automod module.')
                .setRequired(true)
                .addChoices(
                  { name: 'Spam', value: 'autoModSpamImmuneRoles' },
                  { name: 'Malicious Links', value: 'autoModMaliciousImmuneRoles' }
                )
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('roles-remove')
            .setDescription('Make a role no longer immune to an automod module.')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('The role to make stop being immune.').setRequired(true)
            )
            .addStringOption(opt =>
              opt
                .setName('module')
                .setDescription('The automod module.')
                .setRequired(true)
                .addChoices(
                  { name: 'Spam', value: 'autoModSpamImmuneRoles' },
                  { name: 'Malicious Links', value: 'autoModMaliciousImmuneRoles' }
                )
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('roles-view')
            .setDescription('View all immune roles to an automod module.')
            .addStringOption(opt =>
              opt
                .setName('module')
                .setDescription('The automod module.')
                .setRequired(true)
                .addChoices(
                  { name: 'Spam', value: 'autoModSpamImmuneRoles' },
                  { name: 'Malicious Links', value: 'autoModMaliciousImmuneRoles' }
                )
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('channels-add')
            .setDescription('Make a channel immune to an automod module.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to make immune.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)
            )
            .addStringOption(opt =>
              opt
                .setName('module')
                .setDescription('The automod module.')
                .setRequired(true)
                .addChoices(
                  { name: 'Spam', value: 'autoModSpamImmuneChannels' },
                  { name: 'Malicious Links', value: 'autoModMaliciousImmuneChannels' }
                )
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('channels-remove')
            .setDescription('Make a channel no longer immune to an automod module.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to make stop being immune.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)
            )
            .addStringOption(opt =>
              opt
                .setName('module')
                .setDescription('The automod module.')
                .setRequired(true)
                .addChoices(
                  { name: 'Spam', value: 'autoModSpamImmuneChannels' },
                  { name: 'Malicious Links', value: 'autoModMaliciousImmuneChannels' }
                )
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('channels-view')
            .setDescription('View all immune channels to an automod module.')
            .addStringOption(opt =>
              opt
                .setName('module')
                .setDescription('The automod module.')
                .setRequired(true)
                .addChoices(
                  { name: 'Spam', value: 'autoModSpamImmuneChannels' },
                  { name: 'Malicious Links', value: 'autoModMaliciousImmuneChannels' }
                )
            )
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('spam')
        .setDescription('Manage the spam automod.')
        .addSubcommand(cmd =>
          cmd
            .setName('triggers-add')
            .setDescription('Add a trigger to trigger the spam automod.')
            .addIntegerOption(opt =>
              opt
                .setName('amount')
                .setDescription('How many messages need to be sent in `in` seconds to trigger the automod?')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(true)
            )
            .addIntegerOption(opt =>
              opt
                .setName('in')
                .setDescription(
                  'In what time frame (in seconds) do `amount` messages need to be sent to trigger the automod?'
                )
                .setMinValue(1)
                .setMaxValue(60)
                .setRequired(true)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('triggers-remove')
            .setDescription('Remove a trigger from the list of spam triggers.')
            .addIntegerOption(opt =>
              opt
                .setName('amount')
                .setDescription('How many messages need to be sent in `in` seconds to trigger the automod?')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(true)
            )
            .addIntegerOption(opt =>
              opt
                .setName('in')
                .setDescription(
                  'In what time frame (in seconds) do `amount` messages need to be sent to trigger the automod?'
                )
                .setMinValue(1)
                .setMaxValue(60)
                .setRequired(true)
            )
        )
        .addSubcommand(cmd => cmd.setName('triggers-view').setDescription('View all spam triggers.'))
    )
    .addSubcommandGroup(group =>
      group
        .setName('filter')
        .setDescription('Integrate Parallel infractions with built-in Discord AutoMod.')
        .addSubcommand(cmd =>
          cmd
            .setName('rule')
            .setDescription('Modify the AutoMod rule connected to Parallel.')
            .addStringOption(opt =>
              opt.setName('rule').setDescription('The name of the rule.').setAutocomplete(true).setRequired(true)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('add')
            .setDescription('Add a word or phrase to the AutoMod filter.')
            .addStringOption(opt => opt.setName('word').setDescription('The word or phrase').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('remove')
            .setDescription('Remove a word or phrase from the AutoMod filter.')
            .addStringOption(opt => opt.setName('word').setDescription('The word or phrase').setRequired(true))
        )
        .addSubcommand(cmd => cmd.setName('view').setDescription('View the AutoMod filter.'))
    )
)
class AutomodCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const group = interaction.options.getSubcommandGroup();
    const subCmd = interaction.options.getSubcommand();

    if (!group && subCmd === 'view') {
      const {
        autoModSpamToggle,
        autoModSpamPunishment,
        autoModSpamDuration,

        autoModMaliciousToggle,
        autoModMaliciousPunishment,
        autoModMaliciousDuration,

        autoModFilterToggle,
        autoModFilterPunishment,
        autoModFilterDuration
      } = (await this.client.db.guild.findUnique({
        where: { id: interaction.guildId }
      }))!;

      const str = `Spam${!autoModSpamToggle ? ' (Disabled)' : ''}: ${autoModSpamPunishment ?? 'Delete'} ${
        autoModSpamDuration !== 0n ? `for ${ms(Number(autoModSpamDuration), { long: true })}` : ''
      }\nMalicious Links${!autoModMaliciousToggle ? ' (Disabled)' : ''}: ${autoModMaliciousPunishment ?? 'Delete'} ${
        autoModMaliciousDuration !== 0n ? `for ${ms(Number(autoModMaliciousDuration), { long: true })}` : ''
      }\nFilter${!autoModFilterToggle ? ' (Disabled)' : ''}: ${autoModFilterPunishment ?? 'Delete'} ${
        autoModFilterDuration !== 0n ? `for ${ms(Number(autoModFilterDuration), { long: true })}` : ''
      }`;

      return interaction.reply(`\`\`\`\n${str}\`\`\``);
    } else if (subCmd === 'toggle') {
      const module = interaction.options.getString('module', true);
      const value = interaction.options.getBoolean('toggle', true);

      const data = {};
      Object.defineProperty(data, module, {
        value,
        enumerable: true
      });

      await this.client.db.guild.update({
        where: {
          id: interaction.guildId
        },
        data
      });

      return interaction.reply(`${value ? 'Enabled' : 'Disabled'} module.`);
    } else if (subCmd === 'punishment') {
      const module = interaction.options.getString('module', true);
      const punishment = interaction.options.getString('punishment', true) as InfractionType | 'delete';
      const durationStr = interaction.options.getString('duration');
      if (durationStr && (punishment === 'delete' || punishment === InfractionType.Kick))
        throw `Cannot use duration and the ${punishment.toLowerCase()} punishment together.`;
      if (!durationStr && punishment === InfractionType.Mute) throw 'Must use duration for mute punishment.';

      let duration = null;
      if (durationStr && durationStr !== 'never') {
        const unaryTest = +durationStr;
        if (unaryTest) duration = unaryTest * 1000;
        else duration = ms(durationStr) ?? null;

        if (!duration) throw 'Invalid duration.';
        duration = BigInt(duration);
      }
      if (duration && duration < 1000) throw 'Duration must be at least 1 second.';

      const data = {};
      // "Punishment" and "Duration" will be manually appended to modify values. "autoModSpam" is not a valid module name itself.
      Object.defineProperty(data, module + 'Punishment', {
        value: punishment === 'delete' ? null : punishment,
        enumerable: true
      });
      Object.defineProperty(data, module + 'Duration', { value: duration ?? 0, enumerable: true });

      await this.client.db.guild.update({
        where: {
          id: interaction.guildId
        },
        data
      });

      return interaction.reply(
        `Punishment for module set to ${punishment.toLowerCase()} ${
          duration ? `for ${ms(Number(duration), { long: true })}` : ''
        }`
      );
    }

    switch (group) {
      case 'immunity':
        const thing = (interaction.options.getRole('role') ?? interaction.options.getChannel('channel'))!;
        const isRole = thing instanceof Role;

        await interaction.deferReply();
        const guild = (await this.client.db.guild.findUnique({
          where: {
            id: interaction.guildId
          },
          select: {
            autoModSpamImmuneRoles: true,
            autoModSpamImmuneChannels: true,
            autoModMaliciousImmuneRoles: true,
            autoModMaliciousImmuneChannels: true
          }
        }))!;

        const data = {};

        const module = interaction.options.getString('module', true) as keyof typeof guild;
        switch (subCmd) {
          case 'roles-add':
          case 'channels-add':
            if (guild[module]?.includes(thing.id))
              throw `This ${isRole ? 'role' : 'channel'} is already immune to that automod module.`;

            const push = { push: thing.id };

            Object.defineProperty(data, module, { value: push, enumerable: true });

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data
            });

            return interaction.editReply(
              `${isRole ? `<@&${thing.id}>` : `<#${thing.id}>`} is now immune to the provided automod module.`
            );
          case 'roles-remove':
          case 'channels-remove':
            if (!guild[module]?.includes(thing.id))
              throw `This ${isRole ? 'role' : 'channel'} is not immune to that automod module.`;
            guild[module].splice(guild[module].indexOf(thing.id), 1);

            Object.defineProperty(data, module, { value: guild[module], enumerable: true });

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data
            });

            return interaction.editReply(
              `${isRole ? `<@&${thing.id}>` : `<#${thing.id}>`} is no longer immune to the provided automod module.`
            );
          case 'roles-view':
          case 'channels-view':
            const listStr =
              subCmd === 'roles-view'
                ? guild[module].filter(roc => interaction.guild.roles.cache.has(roc)).map(roc => `<@&${roc}>`)
                : guild[module].filter(roc => interaction.guild.channels.cache.has(roc)).map(roc => `<#${roc}>`);

            if (listStr.length > 2000)
              return interaction.editReply(
                `Too long to upload as a Discord message, view here: ${await bin(listStr.join('\n'))}`
              );

            if (listStr.length === 0)
              return interaction.editReply(
                `No immune ${subCmd === 'roles-view' ? 'roles' : 'channels'} set for this module.`
              );

            return interaction.editReply(listStr.join(', '));
        }

        break;
      case 'spam':
        switch (subCmd) {
          case 'triggers-add': {
            const amount = interaction.options.getInteger('amount', true);
            const within = interaction.options.getInteger('in', true);
            const trigger = { amount, within };

            const { autoModSpamTriggers } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if ((autoModSpamTriggers as AutoModSpamTriggers).some(trig => trig.amount === amount))
              throw 'There is already a trigger with that amount.';

            if (autoModSpamTriggers.length >= 5) throw 'You cannot set more than 5 triggers.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamTriggers: { push: trigger } }
            });

            return interaction.editReply('Trigger added.');
          }
          case 'triggers-remove': {
            const amount = interaction.options.getInteger('amount', true);
            const within = interaction.options.getInteger('in', true);
            const { autoModSpamTriggers } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (!(autoModSpamTriggers as AutoModSpamTriggers).some(trig => trig.amount === amount))
              throw 'There is no trigger with that amount.';

            await interaction.deferReply();

            const object = (autoModSpamTriggers as AutoModSpamTriggers).find(
              trig => trig.amount == amount && trig.within == within
            )!;
            const index = autoModSpamTriggers.indexOf(object);
            autoModSpamTriggers.splice(index, 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamTriggers }
            });

            return interaction.editReply('Trigger removed.');
          }
          case 'triggers-view': {
            const { autoModSpamTriggers } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (autoModSpamTriggers.length === 0) return interaction.reply('No triggers set.');

            const spamTriggersStr = (autoModSpamTriggers as AutoModSpamTriggers)
              .map(trig => `${trig.amount} messages in ${trig.within} seconds`)
              .join('\n');
            return interaction.reply(`\`\`\`\n${spamTriggersStr}\`\`\``);
          }
        }
        break;
      case 'filter':
        switch (subCmd) {
          case 'rule': {
            const rule = interaction.options.getString('rule', true);
            await interaction.deferReply();

            if (rule === 'create') {
              const createdRule = await interaction.guild.autoModerationRules.create({
                triggerType: AutoModerationRuleTriggerType.Keyword,
                eventType: AutoModerationRuleEventType.MessageSend,
                actions: [{ type: AutoModerationActionType.BlockMessage }],
                triggerMetadata: {
                  keywordFilter: []
                },
                name: 'Parallel Moderation Filter',
                enabled: true
              });

              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { autoModFilterRuleId: createdRule.id }
              });

              return interaction.editReply('Rule created and integrated!');
            }

            const automodRule = await interaction.guild.autoModerationRules.fetch(rule).catch(() => null);
            if (!automodRule) throw 'Invalid rule ID.';

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModFilterRuleId: rule }
            });

            return interaction.editReply('Rule integrated!');
          }
          case 'add': {
            const word = interaction.options.getString('word', true);
            await interaction.deferReply();

            const { autoModFilterRuleId } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (!autoModFilterRuleId)
              throw 'The AutoMod filter has not been properly configured. Please use `/automod filter rule`.';

            const automodRule = await interaction.guild.autoModerationRules
              .fetch(autoModFilterRuleId)
              .catch(() => null);
            if (!automodRule) {
              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { autoModFilterRuleId: null }
              });

              throw 'The AutoMod filter has not been properly configured. Please use `/automod filter rule`.';
            }

            if (automodRule.triggerMetadata.keywordFilter.includes(word))
              throw 'That word or phrase is already on the filter list.';

            await automodRule.setKeywordFilter(automodRule.triggerMetadata.keywordFilter.concat([word]));

            return interaction.editReply(`Added \`${word}\` to the filter.`);
          }
          case 'remove': {
            const word = interaction.options.getString('word', true);
            await interaction.deferReply();

            const { autoModFilterRuleId } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (!autoModFilterRuleId)
              throw 'The AutoMod filter has not been properly configured. Please use `/automod filter rule`.';

            const automodRule = await interaction.guild.autoModerationRules
              .fetch(autoModFilterRuleId)
              .catch(() => null);
            if (!automodRule) {
              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { autoModFilterRuleId: null }
              });

              throw 'The AutoMod filter has not been properly configured. Please use `/automod filter rule`.';
            }

            if (!automodRule.triggerMetadata.keywordFilter.includes(word))
              throw 'That word or phrase is not on the filter list.';

            const filter = automodRule.triggerMetadata.keywordFilter;
            filter.splice(filter.indexOf(word), 1);

            await automodRule.setKeywordFilter(filter);

            return interaction.editReply(`Removed \`${word}\` from the filter.`);
          }
          case 'view': {
            await interaction.deferReply();

            const { autoModFilterRuleId } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (!autoModFilterRuleId)
              throw 'The AutoMod filter has not been properly configured. Please use `/automod filter rule`.';

            const automodRule = await interaction.guild.autoModerationRules
              .fetch(autoModFilterRuleId)
              .catch(() => null);
            if (!automodRule) {
              await this.client.db.guild.update({
                where: { id: interaction.guildId },
                data: { autoModFilterRuleId: null }
              });

              throw 'The AutoMod filter has not been properly configured. Please use `/automod filter rule`.';
            }

            const filter = automodRule.triggerMetadata.keywordFilter.join(', ');
            if (filter.length === 0) return interaction.editReply('The automod filter is empty.');
            if (filter.length > 1900) throw 'Too big to display. Please view in settings.';

            return interaction.editReply(filter);
          }
        }
    }
  }
}

export default AutomodCommand;
