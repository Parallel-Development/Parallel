import Listener from "../lib/structs/Listener";
import { type ChatInputCommandInteraction } from "discord.js";
const guildReadyCache: Set<string> = new Set();

class ChatInputCommandListener extends Listener {
  constructor() {
    super('chatInputCommand');
  }

  async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Commands must be ran in a guild.', ephemeral: true });

    const command = this.client.commands.get(interaction.commandName);
    if (!command) return interaction.reply({ content: 'Unknown Command.', ephemeral: true });

    await this.confirmGuild(interaction);
    
    try { 
      await command.run(interaction); 
    } catch (e) {
      if (typeof e !== 'string') {
        console.error(e);
        return;
      }

      if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: e, ephemeral: true })
      else return interaction.editReply({ content: e as string })
    }
  }

  private async confirmGuild(interaction: ChatInputCommandInteraction<'cached'>) {
    const guild = await this.client.db.guild.findUnique({
      where: {
        id: interaction.guildId
      }
    });

    if (guild) return true;

    await this.client.db.guild.create({
      data: {
        id: interaction.guildId
      }
    });

    return true;
  }
}

export default ChatInputCommandListener;