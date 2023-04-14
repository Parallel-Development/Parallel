import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, MessageActionRowComponentBuilder } from 'discord.js';

export const infractionsPerPage = 7;

export const yesButton = new ButtonBuilder().setLabel('Yes').setStyle(ButtonStyle.Success).setCustomId('?yes');

export const noButton = new ButtonBuilder().setLabel('No').setStyle(ButtonStyle.Danger).setCustomId('?no');

export const yesNoRow = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

export const mainColor = Colors.Blurple;
export const commonChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
export const domainReg = /(?:[A-z0-9](?:[A-z0-9-]{0,61}[A-z0-9])?\.)+[A-z0-9][A-z0-9-]{0,61}[A-z0-9]/;
export const urlReg = /http(s):\/\/(?:[A-z0-9](?:[A-z0-9-]{0,61}[A-z0-9])?\.)+[A-z0-9][A-z0-9-]{0,61}[A-z0-9]/;
export const pastTenseInfractionTypes = {
  ban: 'banned',
  kick: 'kicked',
  mute: 'muted',
  warn: 'warned'
};
