const Discord = require('discord.js')
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
  name: 'slowmode',
  description: 'Set the slowmode in a designated channel',
  usage: 'slowmode <time> [channel]',
  aliases: ['sm', 'slow'],
  async execute(client, message, args) {
    const accessdenied = new Discord.MessageEmbed()
      .setAuthor('Error', client.user.displayAvatarURL())
      .setColor('#FF0000')
      .setDescription('You do not have the required permissions to execute this command')

    const currentsm = new Discord.MessageEmbed()
      .setColor('#09fff2')
      .setDescription(`The current slowmode is \`${message.channel.rateLimitPerUser} seconds\` | Please specify a time to set the slowmode`)

    const missingperms = new Discord.MessageEmbed()
      .setColor('#FF0000')
      .setDescription('I do not have the permission to set the slowmode. Please give me the `Manage Channels` permission and run again')
      .setAuthor('Error', client.user.displayAvatarURL())

    if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(accessdenied)
    if (!message.guild.me.hasPermission('MANAGE_CHANNELS')) return message.channel.send(missingperms)

    let time = Math.round(parseFloat(args[0]))
    let channel = message.mentions.channels.first()
    if (!channel) channel = message.channel
    if (time < 0.5) {
      message.channel.setRateLimitPerUser(0)
      if (!channel) channel = message.channel
      const slowmodeset = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(`Successfully set the slowmode for ${channel} to \`0 seconds\``)

      message.channel.send(slowmodeset)
      return;
    }
    if (!time) return message.channel.send(currentsm)
    if (time > 21600) return message.channel.send('I can only set the slowmode to a value between 1 and 21600 seconds.')

    channel.setRateLimitPerUser(time).catch(() => { return })

    const slowmodeset = new Discord.MessageEmbed()
      .setColor('#09fff2')
      .setDescription(`Successfully set the slowmode for ${channel} to \`${time} seconds\``)

    message.channel.send(slowmodeset)

    let date = new Date();
    date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();
  }
}
  