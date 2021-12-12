const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'botinfo',
    description: 'Sends information about the bot',
    data: new SlashCommandBuilder().setName('botinfo').setDescription('Sends information about the bot'),
    async execute(client, interaction, args) {
        await client.application.fetch();

        const botinfo = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(interaction.guild))
            .setDescription(
                'Parallel is a Discord bot with advanced modern moderation features. If you would like to join the development / support server, click [here](https://discord.gg/DcmVMPx8bn)'
            )
            .addField('Library & Version', `discord.js ${Discord.version}`, true)
            .addField('Developers', `${client.application.owner.members.map(u => u.user.tag).join(', ')}`, true)
            .addField('Ping (Websocket)', `${client.ws.ping}ms`, true)
            .addField('Servers', `${client.guilds.cache.size}`, true)
            .addField('Uptime', client.util.duration(client.uptime), true)
            .addField('Memory', `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MiB`, true)
            .setAuthor('Parallel Discord Bot', client.user.displayAvatarURL())
            .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL())
            .setThumbnail(client.user.displayAvatarURL().replace('.webp', '.png'));

        return interaction.reply({ embeds: [botinfo] });
    }
};
