import Listener from '../lib/structs/Listener';

class ReadyListener extends Listener {
  constructor() {
    super('ready', true);
  }

  async run() {
    const commands = await this.client.application!.commands.fetch();

    for (const cmd of commands.values()) {
      const command = this.client.commands.slash.get(cmd.name)!;
      command.id = cmd.id;
    }

    console.log(`Logged in as ${this.client.user!.username}`);
  }
}

export default ReadyListener;
