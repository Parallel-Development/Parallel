import { InfractionType, Prisma } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  Role,
  ChannelType,
  AutoModerationRuleTriggerType,
  AutoModerationRuleEventType,
  AutoModerationActionType,
  Guild,
  AutoModerationRule
} from 'discord.js';
import ms from 'ms';
import Command, { data, properties } from '../../lib/structs/Command';
import { AutoModConfig, AutoModSpamTrigger } from '../../types';
import { bin } from '../../lib/util/functions';
import { AutoModLocations } from '../../lib/util/constants';
import { isIntegrated, isRaw } from '../../types/typeguard';
import client from '../../client';

const autoModuleOptions = [
  { name: 'Spam', value: AutoModLocations.Spam.toString() },
  { name: 'Malicious Links', value: AutoModLocations.MaliciousLinks.toString() },
  { name: 'Filter', value: AutoModLocations.Filter.toString() },
  { name: 'Links', value: AutoModLocations.Links.toString() },
  { name: 'Invites', value: AutoModLocations.Invites.toString() }
];

const reverseModules: { [key: string]: string } = {};
reverseModules[AutoModLocations.Spam] = 'spam';
reverseModules[AutoModLocations.Filter] = 'filter';
reverseModules[AutoModLocations.MaliciousLinks] = 'malicious links';
reverseModules[AutoModLocations.Links] = 'links';
reverseModules[AutoModLocations.Invites] = 'invites';

@data(
  new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage the automod configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
            .addChoices(...autoModuleOptions)
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
          option
            .setName('module')
            .setDescription('The automod module.')
            .setRequired(true)
            .addChoices(...autoModuleOptions)
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
                .addChoices(...autoModuleOptions)
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
                .addChoices(...autoModuleOptions)
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
                .addChoices(...autoModuleOptions)
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
                .addChoices(...autoModuleOptions)
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
                .addChoices(...autoModuleOptions)
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
                .addChoices(...autoModuleOptions)
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
@properties<'slash'>({
  clientPermissions: PermissionFlagsBits.ManageGuild
})
class AutomodCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const group = interaction.options.getSubcommandGroup();
    const subCmd = interaction.options.getSubcommand();

    const { autoMod, autoModSpamTriggers } = (await this.client.db.guild.findUnique({
      where: { id: interaction.guildId },
      select: { autoMod: true, autoModSpamTriggers: true }
    }))! as { autoMod: AutoModConfig[]; autoModSpamTriggers: AutoModSpamTrigger[] };

    if (!group)
      switch (subCmd) {
        case 'view':
          let str = '';
          for (const module of autoModuleOptions) {
            const config = autoMod[+module.value] as AutoModConfig;
            str += `${module.name}${!config.toggle ? ' (Disabled)' : ''}: ${config.punishment ?? 'Delete'} ${
              config.duration !== '0' ? `for ${ms(+config.duration, { long: true })}` : ''
            }\n`;
          }

          return interaction.reply(`\`\`\`\n${str}\`\`\``);
        case 'toggle': {
          const location = +interaction.options.getString('module', true);
          const value = interaction.options.getBoolean('toggle', true);

          const config = autoMod[location];
          config.toggle = value;

          if (isIntegrated(config)) {
            if (!config.ruleId) await makeRule(interaction.guild, config, autoMod, location);
            else {
              const rule = await interaction.guild.autoModerationRules
                .fetch(config.ruleId!)
                .catch(() => null);

              if (!rule) await makeRule(interaction.guild, config, autoMod, location); 
            }
          }

          await this.client.db.guild.update({
            where: { id: interaction.guildId },
            data: {
              autoMod
            }
          });

          if (isIntegrated(config))
            await interaction.guild.autoModerationRules.edit(config.ruleId, {
              enabled: value
            });

          return interaction.reply(
            `${value ? 'Enabled' : 'Disabled'} module ${reverseModules[location as keyof typeof reverseModules]}.`
          );
        }
        case 'punishment': {
          const location = +interaction.options.getString('module', true);
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
          }
          if (duration && duration < 1000) throw 'Duration must be at least 1 second.';

          const config = autoMod[location];
          config.punishment = punishment === 'delete' ? null : punishment;
          config.duration = (duration?.toString() as `${number}`) ?? '0';

          if (isIntegrated(config)) {
            if (!config.ruleId) await makeRule(interaction.guild, config, autoMod, location);
            else {
              const rule = await interaction.guild.autoModerationRules
                .fetch(config.ruleId!)
                .catch(() => null);

              if (!rule) await makeRule(interaction.guild, config, autoMod, location); 
            }
          }

          await this.client.db.guild.update({
            where: {
              id: interaction.guildId
            },
            data: {
              autoMod
            }
          });

          return interaction.reply(
            `Punishment for ${
              reverseModules[location as keyof typeof reverseModules]
            } module set to ${punishment.toLowerCase()} ${
              duration ? `for ${ms(Number(duration), { long: true })}` : ''
            }`
          );
        }
      }

    switch (group) {
      case 'immunity':
        const thing = (interaction.options.getRole('role') ?? interaction.options.getChannel('channel'))!;
        const isRole = thing instanceof Role;

        const location = +interaction.options.getString('module', true);
        const config = autoMod[location];
        const raw = isRaw(config);

        const moduleName = reverseModules[location as keyof typeof reverseModules];
        const thingName = isRole ? 'role' : 'channel';

        let array: string[] = [];

        if (isIntegrated(config)) {
          if (!config.ruleId) await makeRule(interaction.guild, config, autoMod, location);

          const autoModArr = await interaction.guild.autoModerationRules
            .fetch(config.ruleId!)
            .then(r => [...r[isRole ? 'exemptRoles' : 'exemptChannels'].values()].map(e => e.id))
            .catch(() => null);
          if (autoModArr) array = autoModArr;
          else
            array = [
              ...(await makeRule(interaction.guild, config, autoMod, location))[
                isRole ? 'exemptRoles' : 'exemptChannels'
              ].values()
            ].map(e => e.id);
        } else array = (config as AutoModConfig<'raw'>)[isRole ? 'immuneRoles' : 'immuneChannels'];

        switch (subCmd) {
          case 'roles-add':
          case 'channels-add':
            if (array.includes(thing.id))
              throw `This ${thingName} is already immune to the ${moduleName} automod module.`;

            array.push(thing.id);

            raw
              ? await this.client.db.guild.update({
                  where: {
                    id: interaction.guildId
                  },
                  data: { autoMod }
                })
              : await interaction.guild.autoModerationRules.edit((config as AutoModConfig<'integrated'>).ruleId, {
                  ...(isRole ? { exemptRoles: array } : { exemptChannels: array })
                });

            return interaction.reply(`${thing.toString()} is now immune to the ${moduleName} automod module.`);
          case 'roles-remove':
          case 'channels-remove':
            if (!array.includes(thing.id)) throw `This ${thingName} is not immune to the ${moduleName} automod module.`;

            array.splice(array.indexOf(thing.id), 1);

            raw
              ? await this.client.db.guild.update({
                  where: {
                    id: interaction.guildId
                  },
                  data: { autoMod }
                })
              : await interaction.guild.autoModerationRules.edit((config as AutoModConfig<'integrated'>).ruleId, {
                  ...(isRole ? { exemptRoles: array } : { exemptChannels: array })
                });

            return interaction.reply(`${thing.toString()} is no longer immune to the ${moduleName} automod module.`);
          case 'roles-view':
          case 'channels-view':
            const listStr =
              subCmd === 'roles-view'
                ? array.filter(roc => interaction.guild.roles.cache.has(roc)).map(roc => `<@&${roc}>`)
                : array.filter(roc => interaction.guild.channels.cache.has(roc)).map(roc => `<#${roc}>`);

            if (listStr.length > 2000)
              return interaction.reply(
                `Too long to upload as a Discord message, view here: ${await bin(listStr.join('\n'))}`
              );

            if (listStr.length === 0) return interaction.reply(`No immune ${thingName}s set for this module.`);

            return interaction.reply(listStr.join(', '));
        }

        break;
      case 'spam':
        switch (subCmd) {
          case 'triggers-add': {
            const amount = interaction.options.getInteger('amount', true);
            const within = interaction.options.getInteger('in', true);
            const trigger = { amount, within };

            if ((autoModSpamTriggers as AutoModSpamTrigger[]).some(trig => trig.amount === amount))
              throw 'There is already a trigger with that amount.';

            if (autoModSpamTriggers.length >= 5) throw 'You cannot set more than 5 triggers.';

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamTriggers: { push: trigger } }
            });

            return interaction.reply('Trigger added.');
          }
          case 'triggers-remove': {
            const amount = interaction.options.getInteger('amount', true);
            const within = interaction.options.getInteger('in', true);

            if (!(autoModSpamTriggers as AutoModSpamTrigger[]).some(trig => trig.amount === amount))
              throw 'There is no trigger with that amount.';

            const object = (autoModSpamTriggers as AutoModSpamTrigger[]).find(
              trig => trig.amount == amount && trig.within == within
            )!;
            const index = autoModSpamTriggers.indexOf(object);
            autoModSpamTriggers.splice(index, 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamTriggers: autoModSpamTriggers as Prisma.InputJsonValue[] }
            });

            return interaction.reply('Trigger removed.');
          }
          case 'triggers-view': {
            const { autoModSpamTriggers } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (autoModSpamTriggers.length === 0) return interaction.reply('No triggers set.');

            const spamTriggersStr = (autoModSpamTriggers as AutoModSpamTrigger[])
              .map(trig => `${trig.amount} messages in ${trig.within} seconds`)
              .join('\n');
            return interaction.reply(`\`\`\`\n${spamTriggersStr}\`\`\``);
          }
        }
        break;
      case 'filter': {
        const config = autoMod[AutoModLocations.Filter] as AutoModConfig<'integrated'>;
        await interaction.deferReply();

        if (!config.ruleId) await makeRule(interaction.guild, config, autoMod, AutoModLocations.Filter);

        let automodRule = await interaction.guild.autoModerationRules.fetch(config.ruleId!).catch(() => null);
        if (!automodRule) automodRule = await makeRule(interaction.guild, config, autoMod, AutoModLocations.Filter);

        switch (subCmd) {
          case 'add': {
            const word = interaction.options.getString('word', true);

            if (automodRule.triggerMetadata.keywordFilter.includes(word))
              throw 'That word or phrase is already on the filter list.';

            await automodRule.setKeywordFilter(automodRule.triggerMetadata.keywordFilter.concat([word]));

            return interaction.editReply(`Added \`${word}\` to the filter.`);
          }
          case 'remove': {
            const word = interaction.options.getString('word', true);

            if (!automodRule.triggerMetadata.keywordFilter.includes(word))
              throw 'That word or phrase is not on the filter list.';

            const filter = automodRule.triggerMetadata.keywordFilter;
            filter.splice(filter.indexOf(word), 1);

            await automodRule.setKeywordFilter(filter);

            return interaction.editReply(`Removed \`${word}\` from the filter.`);
          }
          case 'view': {
            const filter = automodRule.triggerMetadata.keywordFilter.join(', ');
            if (filter.length === 0) return interaction.editReply('The automod filter is empty.');
            if (filter.length > 1900) throw 'Too big to display. Please view in settings.';

            return interaction.editReply(filter);
          }
        }
      }
    }
  }
}

async function makeRule(
  guild: Guild,
  config: AutoModConfig<'integrated'>,
  autoMod: AutoModConfig[],
  module: AutoModLocations
) {
  let createdRule: AutoModerationRule;

  switch (module) {
    case AutoModLocations.Filter:
      createdRule = await guild.autoModerationRules.create({
        triggerType: AutoModerationRuleTriggerType.Keyword,
        eventType: AutoModerationRuleEventType.MessageSend,
        actions: [{ type: AutoModerationActionType.BlockMessage }],
        triggerMetadata: {
          keywordFilter: []
        },
        name: 'Filter',
        enabled: true
      });
      break;
    case AutoModLocations.Links:
      createdRule = await guild.autoModerationRules.create({
        triggerType: AutoModerationRuleTriggerType.Keyword,
        eventType: AutoModerationRuleEventType.MessageSend,
        actions: [{ type: AutoModerationActionType.BlockMessage }],
        triggerMetadata: {
          regexPatterns: ['https?://[A-Za-z0-9]{1,64}\.[a-z]{2,}']
        },
        name: 'Links',
        enabled: true
      });
      break;
    case AutoModLocations.Invites:
      createdRule = await guild.autoModerationRules.create({
        triggerType: AutoModerationRuleTriggerType.Keyword,
        eventType: AutoModerationRuleEventType.MessageSend,
        actions: [{ type: AutoModerationActionType.BlockMessage }],
        triggerMetadata: {
          regexPatterns: ['(https?://)?discord(app)?\.(gg|com/invite)/[A-Za-z0-9]{1,}']
        },
        name: 'Invites',
        enabled: true
      });
      break;
    default:
      throw new Error();
  }

  config.ruleId = createdRule.id;

  await client.db.guild.update({
    where: { id: guild.id },
    data: { autoMod }
  });

  return createdRule;
}

export default AutomodCommand;
