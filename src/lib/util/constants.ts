import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, MessageActionRowComponentBuilder } from 'discord.js';

export const infractionsPerPage = 7;

export namespace Pagination {
  export const backX = new ButtonBuilder().setLabel('<<').setStyle(ButtonStyle.Secondary).setCustomId('pagination:backX');
  export const back = new ButtonBuilder().setLabel('<').setStyle(ButtonStyle.Secondary).setCustomId('pagination:back');
  export const forward = new ButtonBuilder().setLabel('>').setStyle(ButtonStyle.Secondary).setCustomId('pagination:forward');
  export const forwardX = new ButtonBuilder()
    .setLabel('>>')
    .setStyle(ButtonStyle.Secondary)
    .setCustomId('pagination:forwardX');
    
  export const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(backX, back, forward, forwardX);
}

export const mainColor = Colors.Fuchsia;
export const commonChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';