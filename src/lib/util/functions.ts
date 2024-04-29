import {
  type Guild,
  type GuildMember,
  ApplicationCommandPermissionType,
  Collection,
  ApplicationCommandPermissions,
  PermissionFlagsBits,
  MessageCreateOptions
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

  const permissions = commandsPermissionCache.get(member.guild.id)?.get(command.id);
  const hasDefault = member.permissions?.has(command.defaultMemberPermissions ?? 0n);
  const allowed = permissions?.filter(
    permission =>
      permission.permission === true && (permission.id === member.id || member.roles.cache.has(permission.id))
  );
  const denied = permissions?.filter(
    permission =>
      permission.permission === false && (permission.id === member.id || member.roles.cache.has(permission.id))
  );

  // if the user is explicitly denied
  if (denied?.some(deny => deny.type === ApplicationCommandPermissionType.User)) return false;

  // If the user doesn't have permission to run the command by default and there are no allow overrides
  if (!allowed?.length && !hasDefault) return false;

  // if the user has the default permission without an allowed override, but there is a denied override,
  // ensure that one of the roles they have that gives them the permission is not on the deny list.
  if (
    !allowed?.length &&
    denied?.length &&
    (!command.defaultMemberPermissions?.bitfield ||
      denied.some(role => role.id === member.guild.id) ||
      !member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .some(
          r => r.permissions.has(command.defaultMemberPermissions ?? 0n) && !denied?.some(role => role.id === r.id)
        ))
  )
    return false;

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