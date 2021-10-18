const Discord = require('discord.js');

class MessageLogger {
    constructor(client, channel, message, oldMessage = null) {
        if (!client) throw new Error('required argument `client` is missing');
        if (!channel) throw new Error('required argument `channel` is missing');
        if (!message) throw new Error('required argument `message` is missing');
        if (typeof channel !== 'object') throw new Error('channel must be an object');
        if (typeof message !== 'object') throw new Error('message must be an object');
        if (oldMessage && typeof oldMessage !== 'object')
            throw new Error('An optional argument `oldMessage` was found, but not as an object');

        const main = async () => {
            const logEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.log)
                .setAuthor('Parallel Logging', client.user.displayAvatarURL())
                .addField(`User`, `**${message.author.tag}** - \`${message.author.id}\``);
            if (oldMessage) {
                const binnedOldContent = await client.util.createBin(oldMessage.content);
                const binnedContent = await client.util.createBin(message.content);
                logEmbed.setDescription(`[Jump to message](${message.url})`);
                logEmbed.setTitle('Message Update');
                logEmbed.addField(
                    'Old Message',
                    oldMessage.content.length <= 1024 ? oldMessage.content : binnedOldContent
                );
                logEmbed.addField('Updated Message', message.content.length <= 1024 ? message.content : binnedContent);
                logEmbed.addField('Edited in', message.channel.toString());
            } else {
                logEmbed.setTitle('Message Deleted');
                if (message.content)
                    logEmbed.addField(
                        'Deleted Message',
                        message.content.length <= 1024 ? message.content : await client.util.createBin(message.content)
                    );

                if (
                    message.attachments.size === 1 &&
                    !message.attachments
                        .map(attachment => attachment.url)
                        .join('\n')
                        .endsWith('mp4') &&
                    !message.attachments
                        .map(attachment => attachment.url)
                        .join('\n')
                        .endsWith('mov')
                ) {
                    logEmbed.setImage(message.attachments.map(attachment => attachment.url).join('\n'));
                    logEmbed.addField('Deleted in', message.channel.toString());
                } else if (message.attachments.size) {
                    logEmbed.addField('Attachments', message.attachments.map(attachment => attachment.url).join('\n'));
                    logEmbed.addField('Deleted in', message.channel.toString());
                }
            }

            return channel.send({ embeds: [logEmbed] }).catch(() => {});
        };

        return main();
    }
}

module.exports = MessageLogger;
