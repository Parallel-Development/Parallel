import { EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import client from "../client";
import Modal from "../lib/structs/Modal";
import util from 'util';
import { mainColor } from '../lib/util/constants';
import { InfractionType } from "@prisma/client";

class DisputeModal extends Modal {
  constructor() {
    super('dispute')
  }

  async run(interaction: ModalSubmitInteraction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply();

    const infractionId = +interaction.fields.getTextInputValue('id');
    if ((!infractionId && infractionId !== 0) || infractionId < 1) throw 'Invalid infraction ID.';

    const infraction = await client.db.infraction.findUnique({
      where: {
        id: infractionId
      },
      include: {
        guild: true,
        dispute: true
      }
    })

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists in this guild.';
    if (infraction.userId !== interaction.user.id) throw 'You cannot create a dispute for an infraction that is not on your record.';
    if (infraction.type === InfractionType.Unmute || infraction.type === InfractionType.Unban) throw 'You cannot dispute that kind of infraction.';

    const { guild } = infraction;

    if (!guild.allowDispute)
      throw 'This guild is not accepting infraction disputes.';

    if (infraction.userId !== interaction.user.id) throw 'You cannot create a dispute for an infraction that is not on your record.';
    if (guild.disputeBlacklist.includes(interaction.user.id))
      throw 'You are blacklisted from creating new disputes in this guild.';

    if (infraction.dispute) throw 'A dispute for that infraction has already been made.';

    if ([...interaction.fields.fields.values()].slice(1).join('').length > 1000) throw 'Length of answers combined totals to a length greater than 1000.';

    const response = interaction.fields.fields.map(field => { return { question: field.customId, value: field.value }});
    response.shift();

    await client.db.dispute.create({
      data: {
        id: infraction.id,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        response
      }
    });

    if (guild.disputeAlertWebhookId) {
      const webhook = await client.fetchWebhook(guild.disputeAlertWebhookId);
      if (!webhook) {
        await client.db.guild.update({
          where: {
            id: interaction.guildId
          },
          data: {
            disputeAlertWebhookId: null
          }
        });

        return;
      }

      let embedDescription = '';
      embedDescription += `**Infraction ID:** ${infraction.id}\n**Infraction Type:** ${infraction.type.toString()}\n\n`;
      embedDescription += response.map(q => `Question: ${q.question}\nResponse: ${q.value}`).join('\n\n');

      const embed = new EmbedBuilder()
      .setColor(mainColor)
      .setAuthor({ name: `Infraction dispute from ${interaction.user.tag} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(embedDescription)
      .setFooter({ text: `Use /case id:${infraction.id} to get context.` })
      .setTimestamp();
      
      await webhook.send({ embeds: [embed] });
    }

    await interaction.editReply('Dispute successfully submitted!');
  }
}

export default DisputeModal; 