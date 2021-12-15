const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const moment = require('moment');

module.exports = {
    name: 'messageDeleteBulk',
    async execute(client, messages) {

        const channel = messages.first().channel;
        
        const settings = await settingsSchema.findOne({ guildID: channel.guild.id });
        const { messageLogging, messageLoggingIgnored } = settings;

        if (!channel.guild.channels.cache.get(messageLogging) && messageLogging !== 'none') {
            await settingsSchema.updateOne(
                {
                    guildID: channel.guild.id
                },
                {
                    messageLogging: 'none'
                }
            );

            client.cache.settings.delete(channel.guild.id);

            return;
        }

        if (messageLoggingIgnored.includes(channel.id) || messageLoggingIgnored.includes(channel.parentId)) return;


        const sortedMessages = [...messages.values()]
            .reverse()
            .map(message =>
                `${message?.author.tag || 'Unknown'}: ${message?.content || 'No content provided'}`
            )
            .join('\n');
            
        const logEmbed = new Discord.MessageEmbed()
            .setAuthor('Parallel Logging', client.user.displayAvatarURL())
            .setColor(client.config.colors.log)
            .setTitle(`Messages Purged`)
            .addField('Channel', channel.toString(), true)
            .addField('Purged Message Count', messages.size.toString(), true)
            .addField('Date', client.util.timestamp(Date.now()), true)
            .addField('Purged Messages', sortedMessages.length >= 1024 ? await client.util.createBin(sortedMessages) : sortedMessages);

        const binContent = 
            [...messages.values()]
            .filter(message => message.content || message.attachments.size)
            .reverse()
            .map(message =>
                `[ ${moment.utc(message.createdTimestamp).format('h:mm:ss A')} ] from "${message.author.tag}" with ID ${message.author.id}:${message.content ? `\n- Content: ${message.content}` : ''}${message.attachments.size > 0 ? `\n- Attachments:\n ${message.attachments.map(attachment => attachment.url).join('\n ')}` : ''}`
            )
            .filter(message => message)
            .join('\n\n');

        
        const bin = await client.util.createBin(
            binContent ? `// Note: all listed times are in UTC\n\n${binContent}` : 'No detailed message data could be logged'
        );
        
        const viewDetailed = new Discord.MessageButton().setStyle('LINK').setURL(bin).setLabel('View Detailed Log')
        const row = new Discord.MessageActionRow().addComponents(viewDetailed);
        return channel.send({ embeds: [logEmbed], components: [row] }).catch(() => { });
    }
}