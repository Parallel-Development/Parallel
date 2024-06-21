import { InfractionType } from '@prisma/client';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  EmbedData,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputComponent,
  TextInputStyle
} from 'discord.js';
import ms from 'ms';
import Button from '../lib/structs/Button';
import {
  createComplexCustomId,
  getMember,
  hasSlashCommandPermission,
  readComplexCustomId
} from '../lib/util/functions';
import { infractionColors } from '../lib/util/constants';
const reason = 'Unspecified reason.';

class AppealManagerButton extends Button {
  constructor() {
    super('appeal-manager');
  }

  async run(interaction: ButtonInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'appeal-manager')))
      throw "You don't have permission to use this button.";

    const { option, data } = readComplexCustomId(interaction.customId);
    if (!option || !data) return;

    const infractionId = +data[0];

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id: infractionId
      },
      include: { appeal: true, guild: { select: { notifyInfractionChange: true } } }
    });

    if (infraction?.guildId !== interaction.guildId) {
      const acceptedButton = new ButtonBuilder()
        .setCustomId('?')
        .setLabel('Accepted')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true);

      const row = new ActionRowBuilder<ButtonBuilder>();
      row.addComponents(acceptedButton);

      const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Green);

      return interaction.update({ components: [row], embeds: [embed] });
    }

    if (!infraction.appeal) {
      const notAcceptedButton = new ButtonBuilder()
        .setCustomId('?')
        .setLabel('Not accepted')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const row = new ActionRowBuilder<ButtonBuilder>();
      row.addComponents(notAcceptedButton);

      const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Grey);

      return interaction.update({ components: [row], embeds: [embed] });
    }

    const { appeal } = infraction;

    switch (option) {
      case 'accept': {
        switch (infraction.type) {
          case InfractionType.Ban: {
            if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.BanMembers))
              throw "I cannot undo the punishment because I do not have the Ban Members permission. If you don't want to undo the punishment, use the command `/appeal-manager accept` and set the `dont-undo` option to `True`";

            await interaction.guild.members.unban(infraction.userId, reason).catch(() => {
              throw 'That member is not banned. Use the command `/appeal-manager accept` and set the `dont-undo` option to `True` to accept.';
            });

            await this.client.db.task
              .delete({
                where: {
                  userId_guildId_type: {
                    guildId: interaction.guildId,
                    userId: infraction.userId,
                    type: InfractionType.Ban
                  }
                }
              })
              .catch(() => {});

            break;
          }
          case InfractionType.Mute: {
            if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.ModerateMembers))
              throw "I cannot undo the punishment because I do not have the Moderate Members permission. If you don't want to undo the punishment, use the command `/appeal-manager accept` and set the `dont-undo` option to `True`";

            const member = await getMember(interaction.guild, infraction.userId);
            if (!member)
              throw 'I could not undo the punishment because the member is not in the guild. Use the command `/appeal-manager accept` and set the `dont-undo` option to `True` to accept.';

            await member.timeout(null, reason);

            await this.client.db.task
              .delete({
                where: {
                  userId_guildId_type: {
                    guildId: interaction.guildId,
                    userId: member.id,
                    type: InfractionType.Mute
                  }
                }
              })
              .catch(() => {});
            break;
          }
        }

        await interaction.deferUpdate();

        await this.client.db.appeal.delete({
          where: {
            id: infractionId
          }
        });

        await this.client.db.infraction.delete({
          where: {
            id: infractionId
          }
        });

        const acceptButton = new ButtonBuilder()
          .setCustomId('?')
          .setLabel('Accepted')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);

        const row = new ActionRowBuilder<ButtonBuilder>();
        row.addComponents(acceptButton);

        const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Green);

        interaction.editReply({ components: [row], embeds: [embed] });

        const acceptEmbed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle('Appeal Accepted')
          .setColor(Colors.Green)
          .setDescription(
            `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
              reason ? `\n${reason}` : ''
            }`
          );

        if (infraction.guild.notifyInfractionChange)
          await this.client.users
            .fetch(appeal.userId)
            .then(user => user.send({ embeds: [acceptEmbed] }))
            .catch(() => {});

        return;
      }
      case 'deny': {
        const modal = new ModalBuilder()
          .setTitle('Deny Appeal')
          .setCustomId(createComplexCustomId('appeal-manager', null, infractionId.toString()));
        const denyReason = new TextInputBuilder()
          .setLabel('Reason')
          .setMaxLength(3500)
          .setCustomId('reason')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);

        const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
        row.setComponents(denyReason);

        modal.components.push(row);

        interaction.showModal(modal);

        return;
      }
      case 'disregard': {
        await interaction.deferUpdate();

        await this.client.db.appeal
          .delete({
            where: {
              id: infractionId
            }
          })
          .catch(() => {});

        const disregardButton = new ButtonBuilder()
          .setCustomId('?')
          .setLabel('Disregarded')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const row = new ActionRowBuilder<ButtonBuilder>();
        row.addComponents(disregardButton);

        const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Grey);

        return interaction.editReply({ components: [row], embeds: [embed] });
      }
      case 'context': {
        const infractionEmbed = new EmbedBuilder()
          .setTitle(`Case ${infractionId} | ${infraction.type.toString()}`)
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

        return interaction.reply({ embeds: [infractionEmbed], ephemeral: true });
      }
    }
  }
}

export default AppealManagerButton;
