const Discord = require('discord.js');

module.exports = {
    name: 'botinfo',
    description: 'Sends information about the bot',
    usage: 'botinfo',
    async execute(client, message, args) {
        await client.application.fetch();

        const botinfo = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(
                'Parallel is a Discord bot with advanced modern moderation features. If you would like to join the development / support server, click [here](https://discord.gg/DcmVMPx8bn)'
            )
            .addField('Library & Version', `<:discordjs:810209255353352242> discord.js ${Discord.version}`, true)
            .addField('Developers', `${client.application.owner.members.map(u => u.user.tag).join(', ')}`, true)
            .addField('Ping (Websocket)', `${client.ws.ping}ms`, true)
            .addField('Servers', `${client.guilds.cache.size}`, true)
            .addField('Uptime', client.util.duration(client.uptime), true)
            .setAuthor('Parallel Discord Bot', client.user.displayAvatarURL())
            .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL())
            .setThumbnail(client.user.displayAvatarURL().replace('.webp', '.png'));

        return message.reply({ embeds: [botinfo] });
    }
};
