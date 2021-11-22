const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

class ExpiredLogger {
    constructor(client, type, server, user, reason) {
        if (!client) throw new Error('required argument `client` is missing');
        if (!type) throw new Error('required argument `user` is missing');
        if (!server) throw new Error('required argument `server` is missing');
        if (!user) throw new Error('required argument `user` is missing');
        if (!reason) throw new Error('required argument `reason` is missing');
        if (typeof type !== 'string') throw new Error('type must be a string');
        if (typeof server !== 'object') throw new Error('server must be a object');
        if (typeof user !== 'object') throw new Error('user must be a object');
        if (typeof reason !== 'string') throw new Error('reason must be a string');

        const main = async () => {
            const getAutomodLogChannel = await settingsSchema.findOne({
                guildID: server.id
            });

            const { automodLogging } = getAutomodLogChannel;

            if (automodLogging === 'none') return;

            if (!server.channels.cache.get(automodLogging)) {
                await settingsSchema.updateOne(
                    {
                        guildID: server.id
                    },
                    {
                        automodLogging: 'none'
                    }
                );

                client.cache.settings.delete(message.guild.id);
                
                return;
            }

            const expiredLog = new Discord.MessageEmbed()
                .setColor('#ffa500')
                .setAuthor('Parallel Logging', client.user.displayAvatarURL())
                .setTitle(`User automatically ${type}`)
                .addField('User', `**${user.tag}** - \`${user.id}\``, true)
                .addField('Reason', reason);

            const automodLogChannel = server.channels.cache.get(automodLogging);
            automodLogChannel.send({ embeds: [expiredLog] });
        };

        return main();
    }
}

module.exports = ExpiredLogger;
