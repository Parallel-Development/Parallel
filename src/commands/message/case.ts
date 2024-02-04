import { EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { InfractionType } from '@prisma/client';
import ms from 'ms';
import { infractionColors } from '../../lib/util/constants';

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

    const infractionEmbed = new EmbedBuilder()
      .setTitle(`Case ${id} | ${infraction.type.toString()}`)
      .setColor(infractionColors[infraction.type])
      .setDescription(
        `**User:** <@${infraction.userId}> (${infraction.userId})\n**Moderator:** <@${infraction.moderatorId}> (${
          infraction.moderatorId
        })\n**Date:** <t:${Math.floor(Number(infraction.date) / 1000)}> (<t:${Math.floor(
          Number(infraction.date) / 1000
        )}:R>)${
          infraction.expires
            ? `\n**Duration:** ${ms(Number(infraction.expires - infraction.date), {
                long: true
              })}\n**Expires:** <t:${Math.floor(Number(infraction.expires) / 1000)}> (<t:${Math.floor(
                Number(infraction.expires) / 1000
              )}:R>)`
            : ''
        }\n**Reason:** ${infraction.reason}${
          infraction.appeal ? '\n***•** There is an appeal for this infraction*' : ''
        }`
      );

    return message.reply({ embeds: [infractionEmbed] });
  }
}

export default CaseCommand;
