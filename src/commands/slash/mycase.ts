import { type ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import Command, { data, properties } from '../../lib/structs/Command';
import { InfractionType } from '@prisma/client';
import ms from 'ms';

@data(
  new SlashCommandBuilder()
    .setName('mycase')
    .setDescription('View detailed information on an infraction that you have.')
    .addIntegerOption(option => option.setName('id').setDescription('Infraction ID').setMinValue(1).setRequired(true))
)
@properties<'slash'>({
  allowDM: true
})
class MyCaseCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('id', true);
    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { appeal: true }
    });

    if (!infraction || (interaction.inCachedGuild() && infraction?.guildId !== interaction.guildId)) throw 'No infraction with that ID exists in this guild.';
    if (infraction.userId !== interaction.user.id) throw 'That infraction is not on your record.';

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

    return interaction.reply({ embeds: [infractionEmbed] });
  }
}

export default MyCaseCommand;
