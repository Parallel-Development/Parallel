import { SlashCommandBuilder, PermissionFlagsBits as Permissions, ChatInputCommandInteraction } from 'discord.js';
import Command from '../lib/structs/Command';
import decancer from 'decancer';
import { commonChars } from '../lib/util/constants';
import { adequateHierarchy } from '../lib/util/functions';

class FixnickCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName('fixnick')
        .setDescription('Correct a fonted, hoisted, or any other unwanted user/nickname')
        .setDefaultMemberPermissions(Permissions.ManageNicknames)
        .addUserOption(option => option.setName('member').setDescription('The member to correct.').setRequired(true))
        .addStringOption(option =>
          option
            .setName('fix')
            .setDescription('Select what to fix in the member\'s user/nickname.')
            .addChoices(
              { name: 'Font', value: 'font' },
              { name: 'Hoisted', value: 'hoisted' },
              { name: 'Other', value: 'other' }
            )
        )
        .addBooleanOption(option =>
          option.setName('from-username').setDescription('Fix from username rather than guild nickname')
        ),
      [Permissions.ManageNicknames]
    );
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';

    if (member.id === interaction.user.id)
      throw 'You cannot fix your own nickname.';
    if (member.id === this.client.user!.id)
      throw 'You cannot fix my own nickname.';
    if (!adequateHierarchy(interaction.member, member))
      throw "You cannot manage this member's nickname due to inadequate hierarchy.";
    if (!adequateHierarchy(interaction.guild.members.me!, member))
      throw "You cannot manage this member's nickname due to inadequate hierarchy.";

    const type = interaction.options.getString('fix') ?? 'other';
    const fromUsername = interaction.options.getBoolean('from-username') ?? false;
    const name = fromUsername ? member.user.username : member.displayName;

    let fixed = '';
    const code = 'XXXX'.replaceAll('X', x => commonChars[Math.floor(Math.random() * commonChars.length)]);

    switch (type) {
      case 'font':
        fixed = decancer(name);
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
    }

    await member.setNickname(fixed);
    return interaction.reply('Nickname fixed.');
  }
}

export default FixnickCommand;
