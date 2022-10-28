import { type Guild, type GuildMember } from 'discord.js';
import client from '../../client';

export function adequateHierarchy(member1: GuildMember, member2: GuildMember) {
  if (member1.guild.id === member1.id) return true;
  if (member2.guild.id === member2.id) return false;
  return member1.roles.highest.comparePositionTo(member2.roles.highest) >= 0;
}

export async function getUser(userId: string) {
  return client.users.fetch(userId).catch(() => null);
}

export async function getMember(guild: Guild | string, userId: string) {
  if (typeof guild === 'string') return client.guilds.cache.get(guild)!.members.fetch(userId).catch(() => null);
  else return guild.members.fetch(userId).catch(() => null);
}