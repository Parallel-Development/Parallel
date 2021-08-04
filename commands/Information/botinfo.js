const Discord = require('discord.js');

module.exports = {
  name: 'botinfo',
  description: 'Sends information about the bot',
  usage: 'botinfo',
  async execute(client, message, args) {
    const botinfo = new Discord.MessageEmbed()
      .setColor(client.config.colors.main)
      .setDescription(
        'Parallel is a Discord bot created for the main purpose of moderation, but includes high quality music, utility commands, some fun commands, and is very configurable. If you would like to join the development / support server, click [here](https://discord.gg/DcmVMPx8bn)'
      )
      .addField(
        'Library & Version',
        `<:discordjs:810209255353352242> discord.js ${Discord.version}`,
        true
      )
      .addField('Developers', 'Piyeris, dzlandis', true)
      .addField('Ping (Websocket)', `${client.ws.ping}ms`, true)
      .addField('Servers', client.guilds.cache.size, true)
      .addfield(`Users`, client.users.cache.size, true)
      .addField(
        'Uptime',
        client.util.convertMillisecondsToDuration(client.uptime),
        true
      )
      .setAuthor('Parallel Discord Bot', client.user.displayAvatarURL());

    return message.reply({ embeds: [botinfo] });
  },
};
