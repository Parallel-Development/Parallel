import { AutoModerationRuleTriggerType, AutocompleteInteraction } from 'discord.js';
import { channelPermissionOverrides, commonDurations, commonDurationUnits } from '../lib/util/constants';
import { Escalation } from '../types';
import ms from 'ms';
import client from '../client';

export default async function (interaction: AutocompleteInteraction<'cached'>) {
  const focused = interaction.options.getFocused(true);
  const focusedLowercase = focused.value.toLowerCase();

  switch (focused.name) {
    case 'override': {
      const filtered = channelPermissionOverrides
        .filter(override => override.name.toLowerCase().includes(focusedLowercase))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 25);

      return interaction.respond(filtered).catch(() => {});
    }
    case 'rule': {
      const rules = await interaction.guild.autoModerationRules.fetch();
      const filtered = [
        ...rules
          .filter(
            rule =>
              rule.triggerType === AutoModerationRuleTriggerType.Keyword &&
              rule.name.toLowerCase().includes(focusedLowercase)
          )
          .sort((a, b) => a.name.localeCompare(b.name))
          .values()
      ]
        .slice(0, 24)
        .map(rule => ({ name: rule.name, value: rule.id }));

      return interaction.respond([{ name: 'Create For Me', value: 'create' }].concat(filtered)).catch(() => {});
    }
    case 'duration':
    case 'erase-after':
    case 'in':
    case 'within':
    case 'disregard-after':
    case 'slowmode': {
      if (focusedLowercase.length === 0) return interaction.respond(commonDurations);
      let [numStr, unit] = focusedLowercase.split(' ');
      const num = +numStr;
      if (unit === undefined) unit = '';
      if (unit.endsWith('s')) unit = unit.slice(0, -1);

      if (Number.isNaN(num) || !Number.isInteger(num) || num < 1 || num > 1000) return interaction.respond([]);
      const matchingUnits = commonDurationUnits.filter(un => un.includes(unit));

      if (num === 1) return interaction.respond(matchingUnits.map(unit => ({ name: `1 ${unit}`, value: `1 ${unit}` })));
      else
        return interaction.respond(matchingUnits.map(unit => ({ name: `${num} ${unit}s`, value: `${num} ${unit}s` })));
    }
    // lol
    case 'with-in': {
      const type = interaction.options.getString('type');
      const amount = interaction.options.getInteger('amount');

      if (!type) return interaction.respond([]);
      if (!amount) return interaction.respond([]);

      const selectType = type === 'Manual' ? 'escalationsManual' : 'escalationsAutoMod';
      const selectTypeAsQuery = type === 'Manual' ? { escalationsManual: true } : { escalationsAutoMod: true };

      const escalations = (await client.db.guild.findUnique({
        where: { id: interaction.guildId },
        select: selectTypeAsQuery
      }))![selectType] as Escalation[];

      const relevant = escalations.filter(e => e.amount === amount && e.within !== '0');

      const respondData = relevant
        .map(e => ({ name: ms(+e.within, { long: true }), value: e.within }))
        .filter(e => e.name.includes(focusedLowercase))
        .sort((a, b) => +a.value - +b.value)
        .slice(0, 25);

      if (respondData.length === 0) return;

      return interaction.respond(respondData);
    }
    case 'command': {
      const commands = client.commands.slash;
      const aliases = client.aliases;

      let firstMatches = [...commands.keys(), ...aliases.keys()];

      if (interaction.inCachedGuild()) {
        const { shortcuts } = (await client.db.guild.findUnique({
          where: {
            id: interaction.guildId
          },
          select: { shortcuts: true }
        }))!;

        firstMatches.push(...shortcuts.map(s => s.name));
      }

      firstMatches = firstMatches.filter(name => name.includes(focusedLowercase));

      const aliasesOmited: string[] = [];
      for (const match of firstMatches) {
        if (commands.has(match)) aliasesOmited.push(match);
        else if (aliases.has(match)) {
          const matchingCommand = commands.get(aliases.get(match)!)!;
          if (!aliasesOmited.includes(matchingCommand.data.name!)) aliasesOmited.push(matchingCommand.data.name!);
        } else aliasesOmited.push(match);
      }

      const final = aliasesOmited
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 25)
        .map(c => ({ name: c, value: c }));

      return interaction.respond(final);
    }
  }
}
