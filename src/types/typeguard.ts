import { AutoModConfig, CommandProperties } from '.';

export function isIntegrated(config: AutoModConfig): config is AutoModConfig<'integrated'> {
  return 'ruleId' in config;
}

export function isRaw(config: AutoModConfig): config is AutoModConfig<'raw'> {
  return !isIntegrated(config);
}

export function isMessageCommandProperties<M extends 'slash' | 'message'>(
  properties: CommandProperties<M>
): properties is CommandProperties<'message'> {
  return 'name' in properties;
}
