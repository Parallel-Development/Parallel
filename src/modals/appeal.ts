import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';
import { mainColor } from '../lib/util/constants';
import { InfractionType } from '@prisma/client';
import type { AppealResponse } from '../types';
import { createComplexCustomId, readComplexCustomId, webhookSend } from '../lib/util/functions';

class AppealModal extends Modal {
  constructor() {
    super('appeal');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    const { data } = readComplexCustomId(interaction.customId);
    if (!data) return;

    const infractionId = +data[0];
    if ((!infractionId && infractionId !== 0) || infractionId < 1) throw 'Invalid infraction ID.';

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id: infractionId
      },
      include: {
        guild: true,
        appeal: true
      }
    });

    if (infraction?.guildId !== interaction.guildId && !(!interaction.inCachedGuild() && infraction))
      throw 'No infraction with that ID exists in this guild.';
    if (infraction.userId !== interaction.user.id)
      throw 'You cannot create an appeal for an infraction that is not on your record.';
    if (infraction.type === InfractionType.Unmute || infraction.type === InfractionType.Unban)
      throw 'You cannot appeal that kind of infraction.';

    const { guild } = infraction;

    if (!guild.appealAllowed) throw 'This guild is not accepting infraction appeals.';

    if (infraction.userId !== interaction.user.id)
      throw 'You cannot create an appeal for an infraction that is not on your record.';
    if (guild.appealBlacklist.includes(interaction.user.id))
      throw 'You are blacklisted from creating new appeals in this guild.';

    if (infraction.appeal) throw 'A appeal for that infraction has already been made.';

    if ([...interaction.fields.fields.values()].slice(1).join('').length > 1000)
      throw 'Length of answers combined totals to a length greater than 1000.';

    const response: AppealResponse[] = interaction.fields.fields.map(field => ({
      question: field.customId,
      response: field.value
    }));

    await interaction.deferReply();

    await this.client.db.appeal.create({
      data: {
        id: infraction.id,
        guildId: guild.id,
        userId: interaction.user.id,
        response,
        date: BigInt(Date.now())
      }
    });

    if (guild.appealAlertWebhookURL) {
      let embedDescription = '';
      embedDescription += `**Infraction ID:** ${infraction.id}\n**Infraction Type:** ${infraction.type.toString()}\n\n`;
      embedDescription += response.map(q => `** — ${q.question} —**\n${q.response}`).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(mainColor)
        .setAuthor({
          name: `Infraction appeal from ${interaction.user.username} (${interaction.user.id})`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setDescription(embedDescription)
        .setTimestamp();

      const acceptButton = new ButtonBuilder()
        .setCustomId(createComplexCustomId('appeal-manager', 'accept', infraction.id.toString()))
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success);

      const denyButton = new ButtonBuilder()
        .setCustomId(createComplexCustomId('appeal-manager', 'deny', infraction.id.toString()))
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger);

      const disregardButton = new ButtonBuilder()
        .setCustomId(createComplexCustomId('appeal-manager', 'disregard', infraction.id.toString()))
        .setLabel('Disregard')
        .setStyle(ButtonStyle.Secondary);

      const contextButton = new ButtonBuilder()
        .setCustomId(createComplexCustomId('appeal-manager', 'context', infraction.id.toString()))
        .setLabel('Context')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>();
      row.addComponents(acceptButton, denyButton, disregardButton, contextButton);

      try {
        await webhookSend(guild.appealAlertWebhookURL, { embeds: [embed], components: [row] });
      } catch {
        await this.client.db.guild.update({
          where: {
            id: guild.id
          },
          data: {
            appealAlertWebhookURL: null
          }
        });
      }
    }

    await interaction.editReply('Appeal successfully submitted!');
  }
}

export default AppealModal;
