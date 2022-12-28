import { DisputeMethod, InfractionType } from '@prisma/client';
import {
  type ChatInputCommandInteraction,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  TextInputStyle,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  Guild,
  EmbedBuilder,
  Colors,
  EmbedField,
  ModalSubmitInteraction,
  ModalMessageModalSubmitInteraction
} from 'discord.js';
import ms from 'ms';
import Command, { allowDM, data } from '../lib/structs/Command';
import { infractionsPerPage, mainColor, yesNoRow } from '../lib/util/constants';
import { getUser } from '../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('dispute')
    .setDescription('Create a new dispute for an infraction.')
    .addIntegerOption(option =>
      option
        .setName('id')
        .setDescription('The infraction ID for the infraction you are disputing (use /myinfractions to find.)')
        .setMinValue(1)
    )
)
@allowDM
class DisputeCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('id');
    if (interaction.inCachedGuild() && !id) throw 'An infraction ID is required. To retreive it, use /mywarnings.';

    if (!id) {
      const message = await interaction.reply({
        content: 'Do you know the ID of the infraction you are disputing?',
        components: [yesNoRow],
        fetchReply: true
      });

      const q1 = await message
        .awaitMessageComponent({ componentType: ComponentType.Button, time: 10000 })
        .catch(async () => {
          await interaction.editReply({ content: 'Timed out.', components: [] });
          return null;
        });

      if (!q1) return;

      if (q1.customId === 'yes')
        return q1.update({
          content: 'Great! Run the command again but this time provide the infraction ID.',
          components: []
        });

      q1.update('Do you know the name of the guild?');
      const q2 = await message
        .awaitMessageComponent({ componentType: ComponentType.Button, time: 10000 })
        .catch(async () => {
          await interaction.editReply({ content: 'Timed out', components: [] });
          return null;
        });

      if (!q2) return;

      let guild: Guild | undefined;
      let modalI: ModalMessageModalSubmitInteraction | undefined;
      if (q2.customId === 'yes') {
        const nameQ = new TextInputBuilder()
          .setLabel('Guild name')
          .setCustomId('guild_name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameQ);

        const modal = new ModalBuilder().setTitle('Guild Name').setCustomId('?guild_name').setComponents(row);

        q2.showModal(modal);
        const guildNameI = await interaction.awaitModalSubmit({ time: 60000 }).catch(async () => {
          await interaction.editReply({ content: 'Timed out', components: [] });
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

      const warnBtn = new ButtonBuilder().setLabel('Warn').setStyle(ButtonStyle.Secondary).setCustomId('Warn');
      const muteBtn = new ButtonBuilder().setLabel('Mute').setStyle(ButtonStyle.Secondary).setCustomId('Mute');
      const kickBtn = new ButtonBuilder().setLabel('Kick').setStyle(ButtonStyle.Secondary).setCustomId('Kick');
      const banBtn = new ButtonBuilder().setLabel('Ban').setStyle(ButtonStyle.Secondary).setCustomId('Ban');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(warnBtn, muteBtn, kickBtn, banBtn);

      if (modalI)
        await modalI.update({
          content: 'What kind of infraction are you disputing?',
          components: [row]
        });
      else
        await q2.update({
          content: 'What kind of infraction are you disputing?',
          components: [row]
        });

      const q3 = await message
        .awaitMessageComponent({ componentType: ComponentType.Button, time: 10000 })
        .catch(async () => {
          await interaction.editReply({ content: 'Timed out.', components: [] });
          return null;
        });

      if (!q3) return;

      const possibleInfractions = await this.client.db.infraction.findMany({
        where: {
          type: q3.customId as InfractionType,
          guildId: guild?.id,
          userId: interaction.user.id,
          dispute: null,
          guild: { disputeAllowed: true }
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
            "I could not find any infractions. Note that infractions that you have already created a dispute on or guilds that don't have disputes enabled are not shown.",
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
          content: 'These are my best guesses for the infraction you are trying to dispute:',
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
                ? `\n**Moderator:** ${(await getUser(infraction.moderatorId))!.tag} (${infraction.moderatorId})`
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

        return message.edit({
          content: 'This is my best guess for the infraction you are trying to dispute:',
          embeds: [infractionEmbed],
          components: []
        });
      }

      return;
    }

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { dispute: true, guild: true }
    });

    if (infraction?.guildId !== interaction.guildId && !(!interaction.inCachedGuild() && infraction))
      throw 'No infraction with that ID exists.';
    if (infraction.userId !== interaction.user.id)
      throw 'You cannot create a dispute for an infraction that is not on your record.';
    if (infraction.type === InfractionType.Unmute || infraction.type === InfractionType.Unban)
      throw 'You cannot dispute that kind of infraction.';

    const { guild } = infraction;

    if (!guild.disputeAllowed) throw 'This guild is not accepting infraction disputes.';

    if (guild.disputeBlacklist.includes(interaction.user.id))
      throw 'You are blacklisted from creating new disputes in this guild.';

    if (guild.disputeMethod === DisputeMethod.Link)
      return interaction.reply(`Infraction disputes for this guild are set to be handled at ${guild.disputeLink}`);

    if (infraction.dispute) throw 'A dispute for that infraction has already been made.';

    const modal = new ModalBuilder();
    modal.setTitle('Dispute').setCustomId('dispute');

    const idQuestionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();

    const idQuestion = new TextInputBuilder()
      .setLabel('Infraction ID')
      .setStyle(TextInputStyle.Short)
      .setValue(infraction.id.toString())
      .setCustomId('id')
      .setRequired(true);

    idQuestionRow.setComponents(idQuestion);
    modal.components.push(idQuestionRow);

    for (const question of guild.disputeModalQuestions) {
      const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      const questionText = new TextInputBuilder()
        .setLabel(question)
        .setMaxLength(1000)
        .setCustomId(question)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      row.setComponents(questionText);
      modal.components.push(row);
    }

    interaction.showModal(modal);

    return;
  }
}

export default DisputeCommand;
