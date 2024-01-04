import { InfractionType } from '@prisma/client';
import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  Guild,
  EmbedBuilder,
  Colors,
  EmbedField,
  ModalMessageModalSubmitInteraction,
  Message
} from 'discord.js';
import ms from 'ms';
import Command, { properties } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor, yesNoRow } from '../../lib/util/constants';
import { getUser } from '../../lib/util/functions';

@properties<true>({
  name: 'appeal',
  description: 'Create a new appeal for an infraction.',
  allowDM: true
})
class AppealCommand extends Command {
  async run(message: Message, args: string[]) {
    const id = +args[0];
    if ((Number.isNaN(id) || !Number.isInteger(id)) && message.inGuild())
      throw "An infraction ID is required. To retreive it, use /myinfractions. If you are trying to appeal an infraction in another server, you will have to run this command in my DM's.";

    if (!id) {
      const msg = await message.reply({
        content: 'Do you know the ID of the infraction you are appealing?',
        components: [yesNoRow]
      });

      const q1 = await msg
        .awaitMessageComponent({ componentType: ComponentType.Button, time: 10000 })
        .catch(async () => {
          await msg.edit({ content: 'Timed out.', components: [] });
          return null;
        });

      if (!q1) return;

      if (q1.customId === '?yes')
        return q1.update({
          content: 'Great! Run the command again but this time provide the infraction ID.',
          components: []
        });

      q1.update('Do you know the name of the guild?');
      const q2 = await msg
        .awaitMessageComponent({ componentType: ComponentType.Button, time: 10000 })
        .catch(async () => {
          await msg.edit({ content: 'Timed out', components: [] });
          return null;
        });

      if (!q2) return;

      let guild: Guild | undefined;
      let modalI: ModalMessageModalSubmitInteraction | undefined;
      if (q2.customId === '?yes') {
        const nameQ = new TextInputBuilder()
          .setLabel('Guild name')
          .setCustomId('guild_name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameQ);

        const modal = new ModalBuilder().setTitle('Guild Name').setCustomId('?guild_name').setComponents(row);

        q2.showModal(modal);
        const guildNameI = await q2.awaitModalSubmit({ time: 60000 }).catch(async () => {
          await msg.edit({ content: 'Timed out', components: [] });
          return null;
        });

        if (!guildNameI) return;

        const guildName = guildNameI.fields.getTextInputValue('guild_name').toLowerCase();

        const guilds = this.client.guilds.cache.filter(g => g.name.toLowerCase() === guildName);
        if (guilds.size === 0)
          return (guildNameI as ModalMessageModalSubmitInteraction).update({
            content: 'I could not find any guilds with that name.',
            components: []
          });
        if (guilds.size === 1) guild = guilds.first();

        modalI = guildNameI as ModalMessageModalSubmitInteraction;
      }

      const warnBtn = new ButtonBuilder().setLabel('Warn').setStyle(ButtonStyle.Secondary).setCustomId('?Warn');
      const muteBtn = new ButtonBuilder().setLabel('Mute').setStyle(ButtonStyle.Secondary).setCustomId('?Mute');
      const kickBtn = new ButtonBuilder().setLabel('Kick').setStyle(ButtonStyle.Secondary).setCustomId('?Kick');
      const banBtn = new ButtonBuilder().setLabel('Ban').setStyle(ButtonStyle.Secondary).setCustomId('?Ban');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(warnBtn, muteBtn, kickBtn, banBtn);

      if (modalI)
        await modalI.update({
          content: 'What kind of infraction are you appealing?',
          components: [row]
        });
      else
        await q2.update({
          content: 'What kind of infraction are you appealing?',
          components: [row]
        });

      const q3 = await msg
        .awaitMessageComponent({ componentType: ComponentType.Button, time: 10000 })
        .catch(async () => {
          await msg.edit({ content: 'Timed out.', components: [] });
          return null;
        });

      if (!q3) return;

      const possibleInfractions = await this.client.db.infraction.findMany({
        where: {
          type: q3.customId.slice(1) as InfractionType,
          guildId: guild?.id,
          userId: message.author.id,
          appeal: null,
          guild: { appealAllowed: true }
        },
        include: { guild: { select: { infractionModeratorPublic: true } } },
        take: infractionsPerPage,
        orderBy: {
          id: 'desc'
        }
      });

      if (possibleInfractions.length === 0)
        return q3.update({
          content:
            "I could not find any infractions. Note that infractions that you have already created an appeal on or guilds that don't have appeals enabled are not shown.",
          components: []
        });

      if (possibleInfractions.length > 1) {
        const infractionsEmbed = new EmbedBuilder().setColor(mainColor);

        const fields: EmbedField[] = [];
        for (const infraction of possibleInfractions) {
          const field: EmbedField = {
            name: `ID ${infraction.id}: ${infraction.type.toString()} | ${
              this.client.guilds.cache.get(infraction.guildId)?.name
            }`,
            value: `${infraction.reason.slice(0, 100)}${
              infraction.reason.length > 100 ? '...' : ''
            }\n*- <t:${Math.floor(Number(infraction.date / 1000n))}>${
              infraction.guild.infractionModeratorPublic
                ? `, issued by <@${infraction.moderatorId}> (${infraction.moderatorId})`
                : ''
            }*`,
            inline: false
          };

          fields.push(field);
        }

        infractionsEmbed.setFields(fields);

        return q3.update({
          content: 'These are my best guesses for the infraction you are trying to appeal:',
          embeds: [infractionsEmbed],
          components: []
        });
      }

      if (possibleInfractions.length === 1) {
        const infraction = possibleInfractions[0];

        const { infractionModeratorPublic } = infraction.guild;

        const infractionEmbed = new EmbedBuilder()
          .setTitle(`Case ${infraction.id} | ${infraction.type.toString()}`)
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
              infractionModeratorPublic
                ? `\n**Moderator:** ${(await getUser(infraction.moderatorId))!.username} (${infraction.moderatorId})`
                : ''
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
            }\n**Reason:** ${infraction.reason}`
          );

        return msg.edit({
          content: 'This is my best guess for the infraction you are trying to appeal:',
          embeds: [infractionEmbed],
          components: []
        });
      }

      return;
    }

    throw 'Please run this as a slash command.';
  }
}

export default AppealCommand;
