import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

abstract class Command {
  public readonly data: Partial<SlashCommandBuilder>;

  constructor(data: Partial<SlashCommandBuilder>) {
    this.data = data;
  }

  abstract run(interaction: ChatInputCommandInteraction<'cached'>): unknown;
}

export default Command;