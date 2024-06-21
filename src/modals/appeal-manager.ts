import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  EmbedData,
  ModalSubmitInteraction
} from 'discord.js';
import Modal from '../lib/structs/Modal';
import { hasSlashCommandPermission, readComplexCustomId } from '../lib/util/functions';

class AppealManagerModal extends Modal {
  constructor() {
    super('appeal-manager');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    if (!(await hasSlashCommandPermission(interaction.member, 'appeal-manager'))) throw 'Permission revoked.';

    const { data } = readComplexCustomId(interaction.customId);
    if (!data) return;

    const infractionId = +data[0];
    const reason = interaction.fields.getField('reason').value || 'Unspecified reason.';

    console.log(infractionId);

    // This is only for the DENY option.

    const infraction = await this.client.db.infraction.findUnique({
      where: { id: infractionId },
      include: { guild: true, appeal: true }
    });

    console.log(infraction);

    if (!infraction) throw 'This infraction is deleted.';
    if (!infraction.appeal) throw 'This infraction no longer has an appeal.';

    await interaction.deferUpdate();

    await this.client.db.appeal.delete({
      where: {
        id: infractionId
      }
    });

    const acceptButton = new ButtonBuilder()
      .setCustomId('?')
      .setLabel('Denied')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true);

    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(acceptButton);

    const embed = new EmbedBuilder(interaction.message!.embeds[0] as EmbedData).setColor(Colors.Red);

    interaction.editReply({ components: [row], embeds: [embed] });

    const acceptEmbed = new EmbedBuilder()
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
        .fetch(infraction.appeal.userId)
        .then(user => user.send({ embeds: [acceptEmbed] }))
        .catch(() => {});
  }
}

export default AppealManagerModal;
