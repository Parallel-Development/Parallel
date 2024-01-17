import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionsBitField, Message, If } from 'discord.js';
import client from '../../client';
import { CommandProperties, MessageCommandProperties } from '../../types';

export default abstract class Command<IsMsg extends boolean = false> {
  public readonly data: IsMsg extends false ? Partial<SlashCommandBuilder> : null = null!;
  public clientPermissions: PermissionsBitField | null = null;

  // only present in slash commands
  public id: If<IsMsg, null, string> = null!;
  // not present in slash commands
  public name: If<IsMsg, string> = null!;
  public description: If<IsMsg, string> = null!;
  public aliases: If<IsMsg, string[]> = null!;
  public args: If<IsMsg, string[] | null> = null!;
  // Not Available - Redirect to slash command
  public NA: If<IsMsg, boolean> = null!;

  public allowDM = false;
  public guildResolve = false;
  public client = client;

  abstract run(interaction: ChatInputCommandInteraction | Message, args?: string[]): unknown;
}

export function data(data: Partial<SlashCommandBuilder>) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      data = data;
    };
  };
}

export function properties<M extends 'message' | 'slash'>(properties: CommandProperties<M>) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      clientPermissions = properties.clientPermissions ? new PermissionsBitField(properties.clientPermissions) : null;

      name = (properties as MessageCommandProperties).name ?? null;
      description = (properties as MessageCommandProperties).description ?? null;
      args = (properties as MessageCommandProperties).args ?? null;
      aliases = (properties as MessageCommandProperties).aliases ?? [];
      NA = (properties as MessageCommandProperties).NA ?? false;

      allowDM = properties.allowDM;
      guildResolve = properties.guildResolve;
    };
  };
}
