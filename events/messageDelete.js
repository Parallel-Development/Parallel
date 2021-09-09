const settingsSchema = require('../schemas/settings-schema');
const MessageLogger = require('../structures/MessageLogger');

module.exports = {
    name: 'messageDelete',
    async execute(client, message) {

        if (global.void === true && !client.config.developers.includes(message.author.id)) return;

        if (message.author.bot || !message.guild) return;

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id,
        })
        const { messageLogging } = settings;

        if (!message.guild.channels.cache.get(messageLogging) && messageLogging !== 'none') {
            await settingsSchema.updateOne({
                guildID: message.guild.id
            },
                {
                    messageLogging: 'none'
                })

            return;
        }

        if (messageLogging === 'none') return;

        new MessageLogger(client, message.guild.channels.cache.get(messageLogging), message);
    }
}