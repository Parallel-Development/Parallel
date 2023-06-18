import { InfractionType } from '@prisma/client';
import {
  ActionRowBuilder,
  ApplicationCommandPermissionType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  EmbedData,
  PermissionFlagsBits as Permissions
} from 'discord.js';
import ms from 'ms';
import Button from '../lib/structs/Button';
const reason = 'Unspecified reason.';
const tiedCommand = 'appeal-manager';
const error = "You don't have permission to use this button.";

class AppealManagerButton extends Button {
  constructor() {
    super('appeal-manager');
  }

  async run(interaction: ButtonInteraction<'cached'>) {
    const command =
      this.client.application!.commands.cache.find(cmd => cmd.name === tiedCommand) ||
      (await this.client.application!.commands.fetch().then(cmds => cmds.find(cmd => cmd.name === tiedCommand)))!;

    const permissions = await this.client
      .application!.commands.permissions.fetch({ command: command.id, guild: interaction.guildId })
      .catch(() => null);

    const hasDefault = interaction.member.permissions?.has(command.defaultMemberPermissions!);
    const allowed = permissions?.filter(
      permission =>
        permission.permission === true &&
        (permission.id === interaction.user.id || interaction.member.roles.cache.some(r => permission.id === r.id))
    );
    const denied = permissions?.filter(
      permission =>
        permission.permission === false &&
        (permission.id === interaction.user.id || interaction.member.roles.cache.some(r => permission.id === r.id))
    );

    if (denied?.some(deny => deny.type === ApplicationCommandPermissionType.User)) throw error;

    if (!allowed?.length && !(denied?.length && hasDefault)) {
      if (
        !interaction.member.roles.cache.some(
          r => r.permissions.has(command.defaultMemberPermissions!) && !denied?.some(role => role.id === r.id)
        )
      )
        throw error;
    }

    const method = interaction.customId.split(':')[1].split('.')[0] as 'accept' | 'deny' | 'disregard' | 'context';
    const infractionId = +interaction.customId.split('.')[1];

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id: infractionId
      },
      include: { appeal: true, guild: { select: { notifyInfractionChange: true } } }
    });

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists in this guild.';
    if (!infraction.appeal) throw 'That infraction does not have an appeal.';

    const { appeal } = infraction;

    switch (method) {
      case 'accept': {
        switch (infraction.type) {
          case InfractionType.Ban:
            if (!interaction.guild.members.me!.permissions.has(Permissions.BanMembers))
              throw "I cannot undo the punishment because I do not have the Ban Members permission. If you don't want to undo the punishment, use the command `/appeal-manager accept` and set the `dont-undo` option to `True`";
            await interaction.guild.members.unban(infraction.userId, reason).catch(() => {
              throw 'That member is not banned. Use the command `/appeal-manager accept` and set the `dont-undo` option to `True` to accept.';
            });
            break;
          case InfractionType.Mute:
            if (!interaction.guild.members.me!.permissions.has(Permissions.ModerateMembers))
              throw "I cannot undo the punishment because I do not have the Moderate Members permission. If you don't want to undo the punishment, use the command `/appeal-manager accept` and set the `dont-undo` option to `True`";
            await interaction.guild.members
              .fetch(infraction.userId)
              .then(member => member.timeout(null, reason))
              .catch(() => {
                throw 'I could not undo the punishment because the member is not in the guild. Use the command `/appeal-manager accept` and set the `dont-undo` option to `True` to accept.';
              });
            break;
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

        await this.client.db.appeal.delete({
          where: {
            id: infractionId
          }
        });

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

        await this.client.db.appeal.delete({
          where: {
            id: infractionId
          }
        });

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
        await interaction.deferReply({ ephemeral: true });

        const infractionEmbed = new EmbedBuilder()
          .setTitle(`Case ${infractionId} | ${infraction.type.toString()}`)
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
            }\n**Reason:** ${infraction.reason}${
              infraction.appeal ? '\n***•** There is an appeal for this infraction*' : ''
            }`
          );

        return interaction.editReply({ embeds: [infractionEmbed] });
      }
    }
  }
}

export default AppealManagerButton;
