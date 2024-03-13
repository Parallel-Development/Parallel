import { EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { InfractionType } from '@prisma/client';
import ms from 'ms';
import { infractionColors } from '../../lib/util/constants';
import { getUser } from '../../lib/util/functions';

@properties<'message'>({
  name: 'mycase',
  description: 'View detailed information on an infraction that you have.',
  args: '<id>',
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

    const user = await getUser(infraction.userId);
    const moderator = await getUser(infraction.moderatorId);
    const infractionEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${infractionModeratorPublic ? `${moderator!.username} (${moderator!.id})` : `Parallel Moderation`}`,
        iconURL: infractionModeratorPublic ? moderator!.displayAvatarURL() : this.client.user!.displayAvatarURL()
      })
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
          infraction.appeal ? `\n***\\- You made an appeal for this infraction.*` : ''
        }`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id ? infraction.id : 'Undefined'}` })
      .setTimestamp(Number(infraction.date));

    return message.reply({ embeds: [infractionEmbed] });
  }
}

export default MyCaseCommand;
