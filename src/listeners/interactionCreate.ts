import Listener from "../lib/structs/Listener";
import client from "../client";
import { type Interaction } from "discord.js";

class InteractionCreateListener extends Listener {
  constructor() {
    super('interactionCreate');
  }

  async run(interaction: Interaction) {
    if (interaction.isChatInputCommand())
      return client.emit('chatInputCommand', interaction);
    else if (interaction.isModalSubmit())
      return client.emit('modalSubmit', interaction);
  }
}

export default InteractionCreateListener;