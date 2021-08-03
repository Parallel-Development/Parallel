const Discord = require('discord.js');

module.exports.run = async(client, channel, message, oldMessage = null) => {
    const logEmbed = new Discord.MessageEmbed()
    .setColor(client.config.colors.log)
    .setAuthor('Parallel Logging', client.user.displayAvatarURL())
    .addField(`User`, `**${message.author.tag}** - \`${message.author.id}\``);
    if(oldMessage) {
        logEmbed.setDescription(`[Jump to message](${message.url})`);
        logEmbed.setTitle('Message Update');
        logEmbed.addField('Old Message', oldMessage.content.length <= 1500 ? oldMessage.content : await client.util.createBin(oldMessage.content));
        logEmbed.addField('Updated Message', message.content.length <= 1500 ? message.content : await client.util.createBin(message.content));
        logEmbed.addField('Edited in', message.channel);
    } else {
        logEmbed.setTitle('Message Deleted');
        if(message.content) logEmbed.addField('Deleted Message', message.content.length <= 1500 ? message.content : await client.util.createBin(message.content))

        if (message.attachments.size === 1 && !message.attachments.map(attachment => attachment.url).join('\n').endsWith("mp4") && !message.attachments.map(attachment => attachment.url).join('\n').endsWith("mov")) {
            logEmbed.setImage(message.attachments.map(attachment => attachment.url).join('\n'))  
            logEmbed.addField('Deleted in', message.channel);
        } else if (message.attachments.size) {
            logEmbed.addField('Attachments', message.attachments.map(attachment => attachment.url).join('\n'))
            logEmbed.addField('Deleted in', message.channel);
        } 
    }

    return channel.send({ embeds: [logEmbed] }).catch(() => { });

}