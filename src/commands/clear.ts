import { type ChatInputCommandInteraction, PermissionFlagsBits as Permissions, SlashCommandBuilder } from 'discord.js';
import Command from '../lib/structs/Command';

class ClearCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from a channel.')
        .setDefaultMemberPermissions(Permissions.ManageMessages)
        .addIntegerOption(option =>
          option.setName('count').setDescription('Amount of messages to delete').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .addUserOption(option => option.setName('from').setDescription('Clear messages from a specific user.'))
        .addStringOption(option =>
          option.setName('before').setDescription('Clear the messages before a specific message.')
        ),
      [Permissions.ManageMessages]
    );
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!interaction.channel) throw 'Command cannot be ran here.';
    if (!interaction.channel.permissionsFor(interaction.member).has(Permissions.ManageMessages))
      throw 'You need the `Manage Messages` permission in this channel to run this command here.';

    const count = interaction.options.getInteger('count', true);
    const user = interaction.options.getUser('from');

    const uBefore = interaction.options.getString('before')?.trim();

    let before: string | undefined = undefined;
    if (uBefore) {
      if (uBefore.length >= 17 && uBefore.length <= 19) {
        if (!(await interaction.channel.messages.fetch(uBefore))) throw 'Invalid message link.';

        before = uBefore;
      }
      else if (uBefore.startsWith('https://discord.com/channels/')) {
        // constexpr api_link_len = 29
        const [guildId, channelId, messageId] = uBefore.slice(29).split('/');
        if (guildId !== interaction.guildId) throw 'The provided message link is not from this guild.';
        if (channelId !== interaction.channelId) throw 'The provided message link is not from this channel.';
        if (!(await interaction.channel.messages.fetch(messageId))) throw 'Invalid message link.';

        before = messageId;
      } else throw 'Invalid message ID or link.';
    }

    // ephemeral to avoid being purged
    await interaction.deferReply({ ephemeral: true });

    if (user) {
      let deletedTotal = 0;

      for (let i = 0; i < 3; i++) {
        const messages = await interaction.channel.messages.fetch({ limit: 100, before }).then(msgs => {
          if (msgs.size == 0) return false;

          before = msgs.last()!.id;
          const userMsgs = [...msgs.values()].filter(msg => msg.author.id === user.id).slice(
            0,
            count - deletedTotal
          );
          
          if (userMsgs.length == 0) return false;
          return userMsgs;
        });

        if (!messages) break;

        const deletedCount = (await interaction.channel.bulkDelete(messages, true)).size;
        if (deletedCount === 0) break;
        deletedTotal += deletedCount;
      }

      return interaction.editReply(`Deleted \`${deletedTotal}\` messages from ${user.toString()}.`);
    }

    const messages = await interaction.channel.messages.fetch({ limit: count, before });
    const deletedTotal = (await interaction.channel.bulkDelete(messages)).size;

    return interaction.editReply(`Deleted \`${deletedTotal}\` messages.`);
  }
}

export default ClearCommand;
