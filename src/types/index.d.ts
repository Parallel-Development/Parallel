export {};

export interface BasicPunishmentOptions {
  guildId: string;
  userId: string;
  date: bigint;
  reason: string;
  expires?: bigint;
  moderatorId?: string;
}