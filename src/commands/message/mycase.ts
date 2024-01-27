import { EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { InfractionType } from '@prisma/client';
import ms from 'ms';

@properties<'message'>({
  name: 'mycase',
  description: 'View detailed information on an infraction that you have.',
  args: ['<id>'],
  allowDM: true
})
class MyCaseCommand extends Command {
  async run(message: Message, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `id`.';

    const id = +args[0];
    if (Number.isNaN(id)) throw 'Invalid ID.';
    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { appeal: true }
    });

    if (!infraction || (message.inGuild() && infraction?.guildId !== message.guildId))
      throw 'No infraction with that ID exists in this guild.';
    if (infraction.userId !== message.author.id) throw 'That infraction is not on your record.';

    const { infractionModeratorPublic } = (await this.client.db.guild.findUnique({
      where: {
        id: infraction.guildId
      },
      select: { infractionModeratorPublic: true }
    }))!;

    const infractionEmbed = new EmbedBuilder()
      .setTitle(`Case ${id} | ${infraction.type.toString()}`)
      .setColor(
        infraction.type === InfractionType.Warn
          ? Colors.Yellow
          : infraction.type === InfractionType.Mute || infraction.type === InfractionType.Kick
          ? Colors.Orange
          : infraction.type === InfractionType.Unmute || infraction.type === InfractionType.Unban
          ? Colors.Green
          : Colors.Red
      )
      .setDescription(
        `${
          infractionModeratorPublic ? `\n**Moderator:** <@${infraction.moderatorId}> (${infraction.moderatorId})` : ''
        }\n**Date:** <t:${Math.floor(Number(infraction.date) / 1000)}> (<t:${Math.floor(
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
          infraction.appeal ? '\n***•** You made an appeal for this infraction*' : ''
        }`
      );

    return message.reply({ embeds: [infractionEmbed] });
  }
}

export default MyCaseCommand;
