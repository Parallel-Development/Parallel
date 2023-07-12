import { type Guild, type GuildMember } from 'discord.js';
import client from '../../client';

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
