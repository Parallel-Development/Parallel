import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import client from '../../client';

export default abstract class Command {
  public readonly data: Partial<SlashCommandBuilder> = null!;
  public clientPermissions: PermissionsBitField | null = null;
  public allowDM = false;
  public guildResolve = false;
  public client = client;

  abstract run(interaction: ChatInputCommandInteraction): unknown;
}

export function data(data: Partial<SlashCommandBuilder>) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      data = data;
    };
  };
}

export function clientpermissions(clientPermissions: bigint[]) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      clientPermissions = new PermissionsBitField(clientPermissions);
    };
  };
}

export function allowDM<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    allowDM = true;
  };
}

export function guildResolve<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    guildResolve = true;
  };
}
