const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/automod-schema');
const AutomodChecks = require('../structures/AutomodChecks');
const MessageLogger = require('../structures/MessageLogger');

const Discord = require('discord.js');

module.exports = {
    name: 'messageUpdate',
    async execute(client, oldMessage, message) {
        if (global.void === true && !client.config.developers.includes(message.author.id)) return;

        if (message.author.bot || !message.guild || oldMessage.content === message.content) return;

        const getModerators = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const isModerator = getModerators.modRoles.some(role => message.member.roles.cache.has(role));
        const channelBypassed = await automodSchema.findOne({
            guildID: message.guild.id,
            bypassChannels: message.channel.id
        });

        let roleBypassed = false;

        const x = await automodSchema.findOne({
            guildID: message.guild.id
        });
        const { bypassRoles } = x;
        if ([...message.member.roles.cache.values()].some(role => bypassRoles.includes(role.id))) roleBypassed = true;

        if (
            !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !isModerator &&
            !channelBypassed &&
            !roleBypassed
        )
            await new AutomodChecks(client, message, true).execute();

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const { messageLogging, messageLoggingIgnored } = settings;

        if (!message.guild.channels.cache.get(messageLogging) && messageLogging !== 'none') {
            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    messageLogging: 'none'
                }
            );

            client.cache.settings.delete(message.guild.id);

            return;
        }

        if (messageLogging === 'none') return;

        if (
            !messageLoggingIgnored.includes(message.channel.id) &&
            !messageLoggingIgnored.includes(message.channel.parentId)
        )
            new MessageLogger(client, message.guild.channels.cache.get(messageLogging), message, oldMessage);
    }
};
