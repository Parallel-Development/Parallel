import { InfractionType } from '@prisma/client';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  EmbedData,
  PermissionFlagsBits
} from 'discord.js';
import ms from 'ms';
import Button from '../lib/structs/Button';
import { getMember, getUser, hasSlashCommandPermission } from '../lib/util/functions';
import { infractionColors } from '../lib/util/constants';
const reason = 'Unspecified reason.';

class AppealManagerButton extends Button {
  constructor() {
    super('appeal-manager');
  }

  async run(interaction: ButtonInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'appeal-manager')))
      throw "You don't have permission to use this button.";

    const method = interaction.customId.split(':')[1].split('.')[0] as 'accept' | 'deny' | 'disregard' | 'context';
    const infractionId = +interaction.customId.split('.')[1];

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

    switch (method) {
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
        await interaction.deferUpdate();

        await this.client.db.appeal
          .delete({
            where: {
              id: infractionId
            }
          })
          .catch(() => {});

        const denyButton = new ButtonBuilder()
          .setCustomId('?')
          .setLabel('Denied')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true);

        const row = new ActionRowBuilder<ButtonBuilder>();
        row.addComponents(denyButton);

        const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Red);

        interaction.editReply({ components: [row], embeds: [embed] });

        const denyEmbed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle('Appeal Denied')
          .setColor(Colors.Red)
          .setDescription(
            `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
              reason ? `\n${reason}` : ''
            }`
          );

        if (infraction.guild.notifyInfractionChange)
          await this.client.users
            .fetch(appeal.userId)
            .then(user => user.send({ embeds: [denyEmbed] }))
            .catch(() => {});

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

        return interaction.reply({ embeds: [infractionEmbed], ephemeral: true });
      }
    }
  }
}

export default AppealManagerButton;
