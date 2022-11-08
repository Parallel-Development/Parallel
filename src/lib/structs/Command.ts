import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import client from '../../client';

abstract class Command {
  public readonly data: Partial<SlashCommandBuilder>;
  public client = client;

  constructor(data: Partial<SlashCommandBuilder>) {
    this.data = data;
  }

  abstract run(interaction: ChatInputCommandInteraction<'cached'>): unknown;
}

export default Command;