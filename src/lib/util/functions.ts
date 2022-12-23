import { type Guild, type GuildMember } from 'discord.js';
import client from '../../client';

export function adequateHierarchy(member1: GuildMember, member2: GuildMember) {
  if (member1.guild.ownerId === member1.id) return true;
  if (member2.guild.ownerId === member2.id) return false;
  return member1.roles.highest.comparePositionTo(member2.roles.highest) >= 0;
}

export async function getUser(userId: string) {
  return client.users.fetch(userId).catch(() => null);
}

export async function getMember(guild: Guild | string, userId: string) {
  if (typeof guild === 'string')
    return client.guilds.cache
      .get(guild)!
      .members.fetch(userId)
      .catch(() => null);
  else return guild.members.fetch(userId).catch(() => null);
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