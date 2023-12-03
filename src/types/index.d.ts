import { InfractionType } from '@prisma/client';

export type AppealResponse = {
  question: string;
  response: string;
}[];

export type AutoModSpamTriggers = {
  amount: number;
  within: number;
}[];

export type EscalationType = 'Manual' | 'AutoMod';

export type Escalations = {
  amount: number;
  within: `${number}`;
  punishment: InfractionType;
  duration: `${number}`;
}[];

export type SlashCommandProperties = {
  clientPermissions?: bigint[];
  allowDM?: boolean;
  guildResolve?: boolean;
};

export type MessageCommandProperties = {
  name: string;
  description: string;
  args?: string[];
  clientPermissions?: bigint[];
  allowDM?: boolean;
  guildResolve?: boolean;
  aliases?: string[];
  NA?: boolean;
};

export type CommandProperties<M extends boolean = false> = M extends true
  ? MessageCommandProperties
  : SlashCommandProperties;
