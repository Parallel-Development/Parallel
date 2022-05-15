const Discord = require('discord.js');

module.exports = {
    name: 'botinfo',
    description: 'Sends information about the bot',
    usage: 'botinfo',
    async execute(client, message, args) {
        await client.application.fetch();

        const botinfo = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setDescription(
                'Parallel is a Discord bot with advanced modern moderation features. If you would like to join the development / support server, click [here](https://discord.gg/DcmVMPx8bn)'
            )
            .addField('Library & Version', `<:discordjs:810209255353352242> discord.js ${Discord.version}`, true)
            .addField('Developers', `${client.application.owner.members.map(u => u.user.tag).join(', ')}`, true)
            .addField('Ping (Websocket)', `${message.guild.shard.ping}ms`, true)
            .addField('Servers', `${client.guilds.cache.size.toLocaleString()}`, true)
            .addField('Uptime', client.util.duration(client.uptime), true)
            .addField('Memory', `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MiB`, true)
            .setAuthor('Parallel Discord Bot', client.user.displayAvatarURL())
            .setFooter(
                `Information requested by ${message.author.tag} • You're on shard ${message.guild.shardId}`,
                message.author.displayAvatarURL()
            )
            .setThumbnail(client.user.displayAvatarURL());

        return message.reply({ embeds: [botinfo] });
    }
};
