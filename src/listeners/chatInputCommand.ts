import Listener from "../lib/structs/Listener";
import { type ChatInputCommandInteraction } from "discord.js";

class ChatInputCommandListener extends Listener {
  constructor() {
    super('chatInputCommand');
  }

  async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Commands must be ran in a guild.', ephemeral: true });

    const command = this.client.commands.get(interaction.commandName);
    if (!command) return interaction.reply({ content: 'Unknown Command.', ephemeral: true });

    if (command.clientPermissions) {
      if (!interaction.guild.members.me!.permissions.has(command.clientPermissions))
        return interaction.reply({ content: `I don\'t have the required permissions to complete this command.\nMissing: \`${command.clientPermissions.toArray().join('`, `').replaceAll(/[a-z][A-Z]/g, m => `${m[0]} ${m[1]}`)}\``, ephemeral: true })
    }

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