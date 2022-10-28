import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

abstract class Command {
  data: Partial<SlashCommandBuilder>;

  constructor(data: Partial<SlashCommandBuilder>) {
    this.data = data;
  }

  abstract run(interaction: ChatInputCommandInteraction<'cached'>): unknown;
}

export default Command;