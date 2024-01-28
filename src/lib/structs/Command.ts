import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionsBitField, Message, If } from 'discord.js';
import client from '../../client';
import { CommandProperties } from '../../types';
import { isMessageCommandProperties } from '../../types/typeguard';

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
  public slashOnly: If<IsMsg, boolean> = null!;

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

      name = isMessageCommandProperties(properties) ? properties.name : null;
      description = isMessageCommandProperties(properties) ? properties.description : null;
      args = isMessageCommandProperties(properties)
        ? typeof properties.args === 'string'
          ? [properties.args]
          : properties.args
        : null;
      aliases = isMessageCommandProperties(properties) ? properties.aliases ?? [] : [];
      slashOnly = isMessageCommandProperties(properties) ? properties.slashOnly : null;

      allowDM = properties.allowDM;
      guildResolve = properties.guildResolve;
    };
  };
}
