import { AutoModerationActionExecution, AutoModerationRuleTriggerType } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { autoModPunish } from '../handlers/automod';
import { AutoModLocations } from '../lib/util/constants';
import { AutoModConfig } from '../types';
import { isIntegrated } from '../types/typeguard';

const reasons: string[] = [];
reasons[AutoModLocations.Filter] = 'Using a blacklisted word or phrase.';
reasons[AutoModLocations.Links] = 'Sending a link.';
reasons[AutoModLocations.Invites] = 'Sending a Discord server invite.';

class DiscordAutomodListener extends Listener {
  constructor() {
    super('autoModerationActionExecution');
  }

  async run(event: AutoModerationActionExecution) {
    if (event.ruleTriggerType !== AutoModerationRuleTriggerType.Keyword) return;
    await event.guild.members.fetch(event.userId);

    const { autoMod } = (await this.client.db.guild.findUnique({
      where: { id: event.guild.id },
      select: { autoMod: true }
    }))! as { autoMod: AutoModConfig[] };

    const index = autoMod.findIndex(mod => isIntegrated(mod) && mod.ruleId === event.ruleId);
    if (index === -1) return;

    const config = autoMod[index] as AutoModConfig<'integrated'>;
    if (!config.punishment) return;

    return autoModPunish(event.member!, event.guild, reasons[index], config.punishment, BigInt(+config.duration));
  }
}

export default DiscordAutomodListener;
