import { EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getMember } from '../../lib/util/functions';

@properties<true>({
  name: 'change-reason',
  description: 'Change the reason for an infraction.',
  args: ['[id] [new_reason]']
})
class ChangeReason extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required arguments `id` and `new_reason`.';
    if (args.length === 1) throw 'Missing required argument `new_reason`.';

    const id = +args[0];
    if (Number.isNaN(id) || !Number.isInteger(id)) throw 'Invalid ID.';

    const newReason = args.slice(1).join(' ');

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: {
        guild: { select: { notifyInfractionChange: true } }
      }
    });

    if (infraction?.guildId !== message.guildId) throw 'No infraction with that ID exists in this guild.';

    if (newReason === infraction.reason) throw 'The two reasons are the same.';

    await this.client.db.infraction.update({
      where: {
        id
      },
      data: {
        reason: newReason
      }
    });

    const { notifyInfractionChange } = infraction.guild;
    if (notifyInfractionChange) {
      const notifyDM = new EmbedBuilder()
        .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
        .setTitle('Infraction Reason Changed')
        .setColor(Colors.Yellow)
        .setDescription(
          `**Infraction ID:** \`${
            infraction.id
          }\`\n**Infraction punishment:** \`${infraction.type.toString()}\`\n${newReason}`
        );

      const member = await getMember(message.guildId, infraction.userId);
      if (member) await member.send({ embeds: [notifyDM] }).catch(() => {});
    }

    return message.reply('Infraction reason changed.');
  }
}

export default ChangeReason;
