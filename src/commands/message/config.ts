import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'config',
  description: 'Manage the guild configuration.',
  slashOnly: true
})
class ConfigCommand extends Command {
  async run() {
    throw 'Due to the complexity of this command, it is only available via slash commands.';
  }
}

export default ConfigCommand;
