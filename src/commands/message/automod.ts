import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'automod',
  description: 'Manage the automod configuration.',
  slashOnly: true
})
class AutomodCommand extends Command {
  async run() {
    throw 'Due to the complexity of this command, it is only available via slash commands.';
  }
}

export default AutomodCommand;
