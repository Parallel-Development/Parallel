const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/settings-schema');

module.exports = {
    name: 'messageDelete',
    async execute(client, message) {

        if (message.author.bot || !message.guild) return;

        const settings = await settingsSchema.findOne({
            guildid: message.guild.id,
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

        if(messageLogging === 'none') return;

        require('../structures/MessageLogger').run(client, message.guild.channels.cache.get(messageLogging), message);
    }
}