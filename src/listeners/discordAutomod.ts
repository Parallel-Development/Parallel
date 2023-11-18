import { AutoModerationActionExecution, AutoModerationRuleTriggerType } from 'discord.js';
import Listener from '../lib/structs/Listener';
import AutomodListener from './automod';

class DiscordAutomodListener extends Listener {
  constructor() {
    super('autoModerationActionExecution');
  }

  async run(event: AutoModerationActionExecution) {
    if (event.ruleTriggerType !== AutoModerationRuleTriggerType.Keyword) return;
    await event.guild.members.fetch(event.userId);

    const { 
      autoModFilterToggle, 
      autoModFilterRuleId, 
      autoModFilterPunishment,
      autoModFilterDuration
    } = (await this.client.db.guild.findUnique({
      where: { id: event.guild.id }
    }))!;

    if (!autoModFilterToggle || event.ruleId !== autoModFilterRuleId || !autoModFilterPunishment) return;

    return AutomodListener.autoModPunish(
      event.member!, event.guild,
      `Using a blacklisted word or phrase.\nKeyword: \`${event.matchedKeyword}\``,
      autoModFilterPunishment,
      autoModFilterDuration
    );
  }
}

export default DiscordAutomodListener;
