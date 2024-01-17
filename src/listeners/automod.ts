import { AutoModerationActionExecution, AutoModerationRuleTriggerType } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { autoModPunish } from '../handlers/automod';
import { AutoModLocations } from '../lib/util/constants';
import { AutoModConfig } from '../types';

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

    const config = autoMod[AutoModLocations.Filter];
    if (!config.punishment) return;

    switch (event.ruleTriggerType) {
      case AutoModerationRuleTriggerType.Keyword:
        return autoModPunish(
          event.member!,
          event.guild,
          'Using a blacklisted word or phrase.',
          config.punishment,
          BigInt(+config.duration)
        );
    }
  }
}

export default DiscordAutomodListener;
