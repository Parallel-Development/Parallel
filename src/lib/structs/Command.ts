import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import client from '../../client';

abstract class Command {
  public readonly data: Partial<SlashCommandBuilder>;
  public clientPermissions: PermissionsBitField;
  public client = client;

  constructor(data: Partial<SlashCommandBuilder>, clientPermissions: bigint[] = [0n]) {
    this.data = data;
    this.clientPermissions = new PermissionsBitField(clientPermissions);
  }

  abstract run(interaction: ChatInputCommandInteraction<'cached'>): unknown;
}

export default Command;
