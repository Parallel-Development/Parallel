import { type ChatInputCommandInteraction, PermissionFlagsBits as Permissions, SlashCommandBuilder } from 'discord.js';
import Command, { data } from '../../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Purge messages from a channel.')
    .setDefaultMemberPermissions(Permissions.ManageMessages)
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Amount of messages to delete')
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option => option.setName('from').setDescription('Purge messages from a specific user.'))
    .addStringOption(option => option.setName('before').setDescription('Purge the messages before a specific message.'))
    .addStringOption(option => option.setName('after').setDescription('Purge the messages after a specific message.'))
)
class PurgeCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!interaction.channel) throw 'Command cannot be ran here.';
    if (!interaction.channel.permissionsFor(interaction.member).has(Permissions.ManageMessages))
      throw 'You need the `Manage Messages` permission in this channel to run this command here.';

    if (!interaction.channel.permissionsFor(interaction.member).has(Permissions.ManageMessages))
      throw 'I need the `Manage Messages` permission in this channel to run this command here.';

    let count = interaction.options.getInteger('count');
    const user = interaction.options.getUser('from');

    let beforeStr = interaction.options.getString('before') ?? null;
    let afterStr = interaction.options.getString('after') ?? null;

    /**
     * @param validate Check if the message link/ID is valid.
     */
    const extractMessageId = async (str: string, validate = true) => {
      if (str.length >= 17 && str.length <= 19) {
        if (validate && !(await interaction.channel!.messages.fetch(str))) throw 'Invalid message ID.';

        return str;
      } else if (str.startsWith('https://discord.com/channels/')) {
        const [guildId, channelId, messageId] = str.slice(29).split('/');
        if (guildId !== interaction.guildId) throw 'The provided message link is not from this guild.';
        if (channelId !== interaction.channelId) throw 'The provided message link is not from this channel.';
        if (validate && !(await interaction.channel!.messages.fetch(messageId))) throw 'Invalid message link.';

        return messageId;
      } else throw 'Invalid message ID or link.';
    }

    if (beforeStr && afterStr) {
      if (count) throw "Option `count` may not be used when both options `before` and `after` are used; the count is automatically determined.";

      // since both can't be used, use `before` and just modify the `count` to be at most enough to stop before `after`
      const before = await extractMessageId(beforeStr);
      const after = await extractMessageId(afterStr, false);

      const messages = [...(await interaction.channel.messages.fetch({ limit: 100, before })).values()];

      // find after
      const afterMessageIndex = messages.findIndex(msg => msg.id === after);
      if (afterMessageIndex === -1) throw 'Invalid message ID or link for option `after` or option `after` comes before option `before`.';

      count = afterMessageIndex;
      
      if (user)
        for (const message of messages) {
          if (message.id === after) break;
          if (message.author.id !== user.id) --count;
        }

      if (count > 100) count = 100;

      afterStr = null;
    } 
    else if (afterStr && !count) count = 100;
    else if (!count) throw 'Option `count` may only be left empty if option `after` is used.';

    if (count === 0) throw "No messages to delete.";

    let before = beforeStr ? await extractMessageId(beforeStr) : undefined;
    let after = afterStr ? await extractMessageId(afterStr) : undefined;

    // ephemeral to avoid being purged
    await interaction.deferReply({ ephemeral: true });

    if (user) {
      let deletedTotal = 0;

      for (let i = 0; i < 3; i++) {
        const messages = await interaction.channel.messages.fetch({ limit: 100, before, after }).then(msgs => {
          if (msgs.size == 0) return false;

          before = msgs.last()!.id;
          const userMsgs = [...msgs.values()].filter(msg => msg.author.id === user.id).slice(0, count! - deletedTotal);

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

    const messages = await interaction.channel.messages.fetch({ limit: count, before, after });
    const deletedTotal = (await interaction.channel.bulkDelete(messages, true)).size;

    return interaction.editReply(`Deleted \`${deletedTotal}\` messages.`);
  }
}

export default PurgeCommand;
