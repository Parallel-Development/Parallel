import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { getMember } from '../../lib/util/functions';
import { Infraction, InfractionType } from '@prisma/client';

@data(
  new SlashCommandBuilder()
    .setName('remove-infraction')
    .setDescription('Remove an infraction.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(option =>
      option.setName('id').setDescription('The infraction ID.').setMinValue(1).setRequired(true)
    )
    .addStringOption(option => option.setName('reason').setDescription('The reason for removing the infraction.'))
    .addBooleanOption(option =>
      option
        .setName('undo-punishment')
        .setDescription('Undo the associated punishment with the infraction. For example, ban => unban, unban => ban')
    )
)
class RemoveInfractionCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id', true);
    const undo = interaction.options.getBoolean('undo-punishment') ?? false;
    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: {
        guild: true
      }
    });

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists in this guild.';

    const { notifyInfractionChange } = infraction.guild;

    if (undo) {
      switch (infraction.type) {
        case InfractionType.Ban:
          if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.BanMembers))
            throw 'I cannot undo the punishment because I do not have the Ban Members permission.';
          await interaction.guild.members.unban(infraction.userId, reason).catch(() => {
            throw 'That member is not banned.';
          });
          break;
        case InfractionType.Mute:
          if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.ModerateMembers))
            throw 'I cannot undo the punishment because I do not have the Moderate Members permission.';
          await interaction.guild.members
            .fetch(infraction.userId)
            .then(member => member.timeout(null, reason))
            .catch(() => {
              throw 'I could not undo the punishment because the member is not in the guild.';
            });
          break;
        default:
          throw 'I cannot undo that type of punishment.';
      }

      this.client.infractions.createLog({
        userId: infraction.userId,
        guildId: interaction.guildId,
        moderatorId: interaction.user.id,
        reason,
        type: infraction.type === InfractionType.Ban ? InfractionType.Unban : InfractionType.Unmute,
        date: BigInt(Date.now())
      } as Infraction);
    }

    await interaction.deferReply();

    await this.client.db.infraction.delete({
      where: {
        id
      }
    });

    await this.client.db.task
      .delete({
        where: {
          userId_guildId_type: {
            userId: infraction.userId,
            guildId: interaction.guildId,
            type: infraction.type
          }
        }
      })
      .catch(() => {});

    if (notifyInfractionChange) {
      const notifyDM = new EmbedBuilder()
        .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
        .setTitle('Infraction Removed')
        .setColor(Colors.Green)
        .setDescription(
          `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
            reason ? `\n${reason}` : ''
          }${
            undo ? `\n\n***•** You were also ${infraction.type === InfractionType.Mute ? 'unmuted' : 'unbanned'}.*` : ''
          }`
        );

      const member = await getMember(interaction.guildId, infraction.userId);
      if (member) await member.send({ embeds: [notifyDM] }).catch(() => {});
    }

    return interaction.editReply(
      `Infraction \`${infraction.id}\` for <@${infraction.userId}> (${infraction.userId}) has been removed. ${
        undo ? `The user was also ${infraction.type === InfractionType.Mute ? 'unmuted.' : 'unbanned'}` : ''
      }`
    );
  }
}

export default RemoveInfractionCommand;
