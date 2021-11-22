const settingsSchema = require('../schemas/settings-schema');
const MessageLogger = require('../structures/MessageLogger');

module.exports = {
    name: 'messageDelete',
    async execute(client, message) {
        if (global.void === true && !client.config.developers.includes(message.author.id)) return;

        if (message.author.bot || !message.guild) return;

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
            new MessageLogger(client, message.guild.channels.cache.get(messageLogging), message);
    }
};
