const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/settings-schema');

module.exports = {
    name: 'messageUpdate',
    async execute(client, oldMessage, message) {

        if (message.author.bot || !message.guild) return;

        const getModerators = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const isModerator = getModerators.modRoles.some(role => message.member.roles.cache.has(role));
        const channelBypassed = await automodSchema.findOne({
            guildID: message.guild.id,
            bypassChannels: message.channel.id
        })

        if (
            !message.member.permissions.has('MANAGE_MESSAGES') &&
            !isModerator &&
            (!channelBypassed || channelBypassed.length === 0)
        ) require('../structures/AutomodChecks').run(client, message, true);

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

        require('../structures/MessageLogger').run(client, message.guild.channels.cache.get(messageLogging), message, oldMessage)

    }
}
