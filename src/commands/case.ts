import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command from '../lib/structs/Command';
import client from '../client';
import { InfractionType } from '@prisma/client';
import ms from 'ms';

class CaseCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName('case')
        .setDescription('View detailed information on an infraction')
        .setDefaultMemberPermissions(Permissions.ModerateMembers)
        .addIntegerOption(option =>
          option.setName('id').setDescription('Infraction ID').setMinValue(1).setRequired(true)
        )
    );
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id', true);
    const infraction = await client.db.infraction.findUnique({
      where: {
        id
      }
    });

    if (infraction?.guildId !== interaction.guildId)
      throw 'No infraction with that ID exists in this guild.';

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
        }\n**Reason:** ${infraction.reason}`
      );

    return interaction.reply({ embeds: [infractionEmbed] });
  }
}

export default CaseCommand;
