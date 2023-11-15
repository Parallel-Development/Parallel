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

export const channelPermissionOverrides = [
  { name: 'Add Reactions', value: 'AddReactions' },
  { name: 'AttachFiles', value: 'AttachFiles' },
  { name: 'Connect', value: 'Connect' },
  { name: 'Create Invite', value: 'CreateInstantInvite' },
  { name: 'Create Private Threads', value: 'CreatePrivateThreads' },
  { name: 'Create Public Threads', value: 'CreatePublicThreads' },
  { name: 'Embed Links', value: 'EmbedLinks' },
  { name: 'Manage Channel', value: 'ManageChannels' },
  { name: 'Manage Messages', value: 'ManageMessages' },
  { name: 'Manage Threads', value: 'ManageThreads' },
  { name: 'Manage Webhooks', value: 'ManageWebhooks' },
  { name: 'Mention Everyone', value: 'MentionEveryone' },
  { name: 'Priority Speaker', value: 'PrioritySpeaker' },
  { name: 'Read Message History', value: 'ReadMessageHistory' },
  { name: 'Request to Speak', value: 'RequestToSpeak' },
  { name: 'Send Messages', value: 'SendMessages' },
  { name: 'Send Messages in Threads', value: 'SendMessagesInThreads' },
  { name: 'Send TTS Messages', value: 'SendTTSMessages' },
  { name: 'Send Voice Messages', value: 'SendVoiceMessages' },
  { name: 'Speak', value: 'Speak' },
  { name: 'Stream', value: 'Stream' },
  { name: 'Use Application Commands', value: 'UseApplicationCommands' },
  { name: 'Use Activities', value: 'UseEmbeddedActivities' },
  { name: 'Use External Emojis', value: 'UseExternalEmojis' },
  { name: 'Use External Sounds', value: 'UseExternalSounds' },
  { name: 'Use External Stickers', value: 'UseExternalStickers' },
  { name: 'Use Soundboard', value: 'UseSoundboard' },
  { name: 'Use Voice-Activity-Detection (VAD)', value: 'UseVAD' },
  { name: 'View Channel', value: 'ViewChannel' }
];