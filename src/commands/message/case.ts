import { EmbedBuilder, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import ms from 'ms';
import { infractionColors } from '../../lib/util/constants';
import { getUser } from '../../lib/util/functions';
import { InfractionType } from '@prisma/client';

@properties<'message'>({
  name: 'case',
  description: 'View detailed information on an infraction.',
  args: '<id>'
})
class CaseCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `id`.';

    const id = +args[0];
    if (Number.isNaN(id) || !Number.isInteger(id)) throw 'Invalid ID.';

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { appeal: true }
    });

    if (infraction?.guildId !== message.guildId) throw 'No infraction with that ID exists in this guild.';

    const user = await getUser(infraction.userId);
    const moderator = await getUser(infraction.moderatorId);
    const infractionEmbed = new EmbedBuilder()
      .setAuthor({ name: `${moderator!.username} (${moderator!.id})`, iconURL: moderator!.displayAvatarURL() })
      .setColor(infractionColors[infraction.type])
      .setDescription(
        `**${
          infraction.type === InfractionType.Ban || infraction.type === InfractionType.Unban ? 'User' : 'Member'
        }:** \`${user!.username}\` (${user!.id})\n**Action:** ${infraction.type.toString()}${
          infraction.expires
            ? `\n**Duration:** ${ms(Number(infraction.expires - infraction.date), {
                long: true
              })}\n**Expires:** <t:${Math.floor(Number(infraction.expires) / 1000)}> (<t:${Math.floor(
                Number(infraction.expires) / 1000
              )}:R>)`
            : ''
        }\n**Reason:** ${infraction.reason}${
          infraction.appeal ? `\n***\\- There is an appeal for this infraction.*` : ''
        }`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id ? infraction.id : 'Undefined'}` })
      .setTimestamp(Number(infraction.date));

    return message.reply({ embeds: [infractionEmbed] });
  }
}

export default CaseCommand;
