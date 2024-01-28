import {
  type Guild,
  type GuildMember,
  ApplicationCommandPermissionType,
  Collection,
  ApplicationCommandPermissions,
  PermissionFlagsBits
} from 'discord.js';
import client from '../../client';
import ms from 'ms';
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

export async function hasSlashCommandPermission(
  member: GuildMember,
  commandName: string,
  type: 'global' | 'guild' = 'global'
) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const cmdId = type === 'global' ? client.commands.slash.get(commandName)?.id! : '';
  const shortcutId =
    type === 'guild'
      ? (
          await client.db.shortcut.findUnique({
            where: { guildId_name: { guildId: member.guild.id, name: commandName } }
          })
        )?.id!
      : '';

  const command =
    type === 'global'
      ? await client.application!.commands.fetch(cmdId, { guildId: member.guild.id })
      : await member.guild.commands.fetch(shortcutId);

  if (!command) return true;

  const permissions = commandsPermissionCache.get(member.guild.id)!.get(command.id);
  const hasDefault = member.permissions?.has(command.defaultMemberPermissions ?? 0n);
  const allowed = permissions?.filter(
    permission =>
      permission.permission === true && (permission.id === member.id || member.roles.cache.has(permission.id))
  );
  const denied = permissions?.filter(
    permission =>
      permission.permission === false && (permission.id === member.id || member.roles.cache.has(permission.id))
  );
  if (denied?.some(deny => deny.type === ApplicationCommandPermissionType.User)) return false;
  if (!allowed?.length && !(denied?.length && hasDefault)) {
    if (
      !member.roles.cache.some(
        r => r.permissions.has(command.defaultMemberPermissions ?? 0n) && !denied?.some(role => role.id === r.id)
      )
    )
      return false;
  }

  return true;
}
