import {
  type Guild,
  type GuildMember,
  Collection,
  ApplicationCommandPermissions,
  PermissionFlagsBits,
  MessageCreateOptions,
  GuildTextBasedChannel
} from 'discord.js';
import client from '../../client';
import ms from 'ms';
import { NoChannelPermissionError } from './constants';
export const commandsPermissionCache = new Map<string, Collection<string, readonly ApplicationCommandPermissions[]>>();

export function adequateHierarchy(member1: GuildMember, member2: GuildMember) {
  if (member1.guild.ownerId === member1.id) return true;
  if (member2.guild.ownerId === member2.id) return false;
  return member1.roles.highest.comparePositionTo(member2.roles.highest) > 0;
}

const snowflakeReg = /^\d{17,19}$/;
export async function getUser(user: string) {
  if (user.startsWith('<@')) {
    user = user.slice(2, -1);
    if (user.startsWith('!')) user = user.slice(1);
  }

  if (!snowflakeReg.test(user)) return null;
  return client.users.fetch(user).catch(() => null);
}

export async function getMember(guild: Guild | string, user: string) {
  if (user.startsWith('<@')) {
    user = user.slice(2, -1);
    if (user.startsWith('!')) user = user.slice(1);
  }

  if (!snowflakeReg.test(user)) return null;

  if (typeof guild === 'string')
    return client.guilds.cache
      .get(guild)!
      .members.fetch(user)
      .catch(() => null);
  else return guild.members.fetch(user).catch(() => null);
}

export function getChannel(guild: Guild | string, channel: string) {
  if (channel.startsWith('<#')) channel = channel.slice(2, -1);

  if (typeof guild === 'string') return client.guilds.cache.get(guild)!.channels.cache.get(channel) ?? null;
  else return guild.channels.cache.get(channel) ?? null;
}

export function parseDuration(durationStr: string) {
  if (!durationStr) return NaN;

  let duration;

  const unaryTest = +durationStr;
  if (unaryTest) duration = unaryTest * 1000;
  else duration = ms(durationStr) ?? NaN;

  return duration;
}

export async function bin(data: any, ext: string = 'js') {
  const binReq = await fetch('https://hst.sh/documents', {
    method: 'POST',
    body: typeof data === 'object' ? JSON.stringify(data, null, 2) : data
  });

  if (!binReq.ok) throw `Error uploading to hastebin; status code: ${binReq.status}`;
  const bin = await binReq.json();
  return `https://hst.sh/${bin.key}.${ext}`;
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getCommand(guild: Guild, commandName: string) {
  const isGlobal = client.commands.slash.has(commandName);

  const cmdId = isGlobal
    ? client.commands.slash.get(commandName)?.id!
    : (
        await client.db.shortcut.findUnique({
          where: { guildId_name: { guildId: guild.id, name: commandName } }
        })
      )?.id!;

  const command = isGlobal
    ? await client.application!.commands.fetch(cmdId, { guildId: guild.id }).catch(() => null)
    : await guild.commands.fetch(cmdId).catch(() => null);

  return command;
}

export async function hasSlashCommandPermission(member: GuildMember, commandName: string) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const command = await getCommand(member.guild, commandName);
  if (!command) return true;

  const hasDefault = member.permissions?.has(command.defaultMemberPermissions ?? 0n);

  const botPermissions = commandsPermissionCache.get(member.guild.id)!;

  const globalPerms = botPermissions.get(client.user!.id);
  const cmdPerms = botPermissions.get(command.id);

  const allowed = cmdPerms?.some(
    perm => perm.permission === true && (perm.id === member.id || member.roles.cache.has(perm.id))
  );
  const denied = cmdPerms?.some(perm => perm.permission === false && member.roles.cache.has(perm.id));
  const userDenied = cmdPerms?.some(perm => perm.permission === false && perm.id === member.id);

  // if the user is explicitly denied
  if (userDenied) return false;

  // if they have a role that's denied and no allowed role (or user)
  if (denied && !allowed) return false;

  // If the user doesn't have permission to run the command by default OR they are denied in global perms
  // ... and there are no allow overrides
  if (!allowed) {
    if (!hasDefault) return false;

    if (globalPerms) {
      const allowed = globalPerms?.some(
        perm => perm.permission === true && (perm.id === member.id || member.roles.cache.has(perm.id))
      );
      const denied = globalPerms?.some(perm => perm.permission === false && member.roles.cache.has(perm.id));
      const userDenied = globalPerms?.some(perm => perm.permission === false && perm.id === member.id);

      if (userDenied) return false;
      if (denied && !allowed) return false;
    }
  }

  return true;
}

// return true if they have permission, otherwise return why they can't run that command in the channel.
export async function hasChannelPermission(member: GuildMember, channel: GuildTextBasedChannel, commandName: string) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const command = await getCommand(member.guild, commandName);
  if (!command) return true;

  if (!channel.permissionsFor(member).has(PermissionFlagsBits.UseApplicationCommands)) {
    if (!member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) return NoChannelPermissionError.Server;
    else return NoChannelPermissionError.Channel;
  }

  const botPermissions = commandsPermissionCache.get(member.guild.id)!;

  // I have no idea either
  const allChannelsId = (BigInt(member.guild.id) - 1n).toString();

  const globalPerms =
    botPermissions.get(client.user!.id)?.find(perm => perm.id === channel.id) ??
    botPermissions.get(client.user!.id)?.find(perm => perm.id === allChannelsId);

  const cmdPerms = botPermissions.get(command.id)?.find(perm => perm.id === channel.id);

  if (cmdPerms?.permission === false) return NoChannelPermissionError.OneCommand;

  if (globalPerms?.permission === false && cmdPerms?.permission !== true) return NoChannelPermissionError.AllCommands;

  return true;
}

export function createComplexCustomId(name: string, option: string | null, data: string | string[] | null) {
  // example: "tag-manager:create?test" or "eval:?true&5"
  return `${name}:${option ?? ''}?${typeof data === 'string' ? data : data ? data.join('&') : ''}`;
}

export function readComplexCustomId(customId: string) {
  const colonIndex = customId.indexOf(':');
  if (colonIndex === -1) return { name: customId, option: null, data: null };

  const name = customId.slice(0, colonIndex);

  let questionIndex = customId.indexOf('?');
  if (questionIndex === -1) questionIndex = customId.length;

  const dataStr = customId.slice(questionIndex + 1);
  const data = dataStr ? dataStr.split('&') : null;
  const option = customId.slice(colonIndex + 1, questionIndex);

  return { name, option: option || null, data };
}

export async function webhookSend(webhookURL: string, messageData: MessageCreateOptions) {
  const req = await fetch(webhookURL, {
    body: JSON.stringify(messageData),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!req.ok) throw await req.json();
  else return;
}
