import { DisputeMethod, InfractionType } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  ActionRow,
  ModalActionRowComponentBuilder,
  TextInputStyle
} from 'discord.js';
import client from '../client';
import Command from '../lib/structs/Command';

class DisputeCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName('dispute')
        .setDescription('Create a new dispute for an infraction.')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The infraction ID for the infraction you are disputing (use /myinfractions to find.)')
            .setMinValue(1)
            .setRequired(true)
        )
    );
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const infraction = await client.db.infraction.findUnique({
      where: {
        id: interaction.options.getInteger('id', true)
      },
      include: { dispute: true, guild: true }
    });

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists.';
    if (infraction.userId !== interaction.user.id) throw 'You cannot create a dispute for an infraction that is not on your record.';
    if (infraction.type === InfractionType.Unmute || infraction.type === InfractionType.Unban) throw 'You cannot dispute that kind of infraction.';

    const { guild } = infraction;

    if (!guild.allowDispute)
      throw 'This guild is not accepting infraction disputes.';

    if (guild.disputeBlacklist.includes(interaction.user.id))
      throw 'You are blacklisted from creating new disputes in this guild.';

    if (guild.disputeMethod === DisputeMethod.Link)
      return interaction.reply(
        `Infraction disputes for this guild are set to be handled at ${guild.disputeLink}`
      );

    if (infraction.dispute) throw 'A dispute for that infraction has already been made.';

    const modal = new ModalBuilder();
    modal.setTitle('Dispute').setCustomId('modal:dispute');

    const idQuestionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();

    const idQuestion = new TextInputBuilder()
    .setLabel('Infraction ID')
    .setStyle(TextInputStyle.Short)
    .setValue(infraction.id.toString())
    .setCustomId('id')
    .setRequired(true);
    
    idQuestionRow.setComponents(idQuestion);
    modal.components.push(idQuestionRow);

    for (const question of guild.disputeModalQuestions) { // ya
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
