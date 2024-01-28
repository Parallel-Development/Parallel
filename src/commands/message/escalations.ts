import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'escalations',
  description: 'Escalations allow you to punish members for reaching an amount of warnings.',
  slashOnly: true
})
class EscalationsCommand extends Command {
  async run() {
    throw 'Due to the complexity of this command, it is only available via slash commands.';
  }
}

export default EscalationsCommand;
