import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import Command, { data, properties } from '../../lib/structs/Command';
const decancer = require('decancer');
import { commonChars } from '../../lib/util/constants';
import { adequateHierarchy } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('clean-nick')
    .setDescription('Correct a non-default font, hoisted, or any other unwanted user/nickname.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(option => option.setName('member').setDescription('The member to correct.').setRequired(true))
    .addStringOption(option =>
      option
        .setName('clean')
        .setDescription("Select what to clean in the member's user/nickname.")
        .addChoices(
          { name: 'Font', value: 'font' },
          { name: 'Hoisted', value: 'hoisted' },
          { name: 'Other', value: 'other' }
        )
    )
    .addBooleanOption(option =>
      option.setName('from-username').setDescription('Clean from username rather than guild nickname.')
    )
)
@properties<'slash'>({
  clientPermissions: PermissionFlagsBits.ManageNicknames
})
class CleannickCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';

    if (member.id === interaction.user.id) throw 'You cannot clean your own nickname.';
    if (member.id === this.client.user!.id) throw 'You cannot clean my own nickname.';
    if (!adequateHierarchy(interaction.member, member))
      throw "You cannot manage this member's nickname due to inadequate hierarchy.";
    if (!adequateHierarchy(interaction.guild.members.me!, member))
      throw "You cannot manage this member's nickname due to inadequate hierarchy.";

    const type = interaction.options.getString('clean') ?? 'other';
    const fromUsername = interaction.options.getBoolean('from-username') ?? false;
    const name = fromUsername ? member.user.username : member.displayName;

    let fixed = '';
    const code = 'XXXX'.replaceAll('X', x => commonChars[Math.floor(Math.random() * commonChars.length)]);

    switch (type) {
      case 'font':
        fixed = decancer(name).toString();
        if (fixed === name) throw 'Nothing changed.';
        break;
      case 'hoisted':
        for (let i = 0; i < name.length; i++) {
          if (name.charCodeAt(i) > 64 || +name[i]) break;
          fixed = name.slice(i + 1);
        }

        if (fixed.length === 0) fixed = `Fixed ${code}`;
        break;
      case 'other':
        fixed = `Fixed ${code}`;
        break;
    }

    await member.setNickname(fixed);
    return interaction.reply('Nickname cleaned.');
  }
}

export default CleannickCommand;
