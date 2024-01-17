import { AutoModConfig } from '.';

export function isIntegrated(config: AutoModConfig): config is AutoModConfig<'integrated'> {
  return 'ruleId' in config;
}

export function isRaw(config: AutoModConfig): config is AutoModConfig<'raw'> {
  return !isIntegrated(config);
}
