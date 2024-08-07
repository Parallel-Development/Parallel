import { InfractionType } from '@prisma/client';

export type AppealResponse = {
  question: string;
  response: string;
};

type AutoModConfigIntegrated = {
  toggle: boolean;
  punishment: InfractionType | null;
  duration: `${number}`;
  ruleId: string;
};

type AutoModConfigRaw = {
  toggle: boolean;
  punishment: InfractionType | null;
  duration: `${number}`;
  immuneChannels: string[];
  immuneRoles: string[];
};

export type AutoModConfig<I extends 'integrated' | 'raw' = null> = I extends 'integrated'
  ? AutoModConfigIntegrated
  : I extends 'raw'
    ? AutoModConfigRaw
    : {
        toggle: boolean;
        punishment: InfractionType | null;
        duration: `${number}`;
      };

export type AutoModSpamTrigger = {
  amount: number;
  within: number;
};

export type CommandProperties<M extends 'slash' | 'message'> = M extends 'message'
  ? MessageCommandProperties
  : {
      clientPermissions?: bigint | bigint[];
      allowDM?: boolean;
      guildResolve?: boolean;
      devOnly?: boolean;
    };

export type EscalationType = 'Manual' | 'AutoMod';

export type Escalation = {
  amount: number;
  within: `${number}`;
  punishment: InfractionType;
  duration: `${number}`;
};

type MessageCommandProperties = {
  name: string;
  description: string;
  args?: string | string[];
  clientPermissions?: bigint | bigint[];
  allowDM?: boolean;
  guildResolve?: boolean;
  aliases?: string[];
  slashOnly?: boolean;
  devOnly?: boolean;
};
