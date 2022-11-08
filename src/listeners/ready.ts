import Listener from "../lib/structs/Listener";

class ReadyListener extends Listener {
  constructor() {
    super('ready', true);
  }

  async run() {
    console.log(`Logged in as ${this.client.user!.tag}`);
  }
}

export default ReadyListener;