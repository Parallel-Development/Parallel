import Listener from "../lib/structs/Listener";
import client from "../client";
import { type Interaction } from "discord.js";
const guildReadyCache: Set<string> = new Set();

class InteractionCreateListener extends Listener {
  constructor() {
    super('interactionCreate');
  }

  async run(interaction: Interaction) {
    if (interaction.isButton() && interaction.inCachedGuild()) {
      const associated = client.buttons.get(interaction.customId);
      if (!associated) return;

      try {
        await associated.run(interaction);
      } catch (e) {
        if (typeof e !== 'string') {
          console.error(e);
          return;
        }

        return interaction.reply({ content: e, ephemeral: true })
        .catch(() => {
          interaction.editReply({ content: e as string })
          .catch(() => {});
        })
      }
    }
    
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Commands must be ran in a guild.', ephemeral: true });

    const command = client.commands.get(interaction.commandName);
    if (!command) return interaction.reply({ content: 'Unknown Command.', ephemeral: true });

    if (!guildReadyCache.has(interaction.guildId)) {
      await client.db.guild.upsert({
        create: {
          id: interaction.guildId
        },
        update: {},
        where: { id: interaction.guildId }
      });

      guildReadyCache.add(interaction.guildId);
    }

    try {
      await command.run(interaction);
    } catch (e) {
      if (typeof e !== 'string') {
        console.error(e);
        return;
      }

      return interaction.reply({ content: e, ephemeral: true })
      .catch(() => {
        interaction.editReply({ content: e as string })
        .catch(() => {});
      })
    }
  }
}

export default InteractionCreateListener;