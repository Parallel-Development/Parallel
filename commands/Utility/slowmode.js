const Discord = require('discord.js')
const ms = require('ms');

module.exports = {
    name: 'slowmode',
    description: 'Set the slowmode for the channel',
    usage: 'slowmode [channel]',
    aliases: ['sm', 'slow'],
    permissions: 'MANAGE_CHANNELS',
    requiredBotPermission: 'MANAGE_CHANNELS',
    async execute(client, message, args) {

        if(!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_amount);
        const slowmode = Math.round(ms(args[0]));
        if(!slowmode && slowmode != 0) return message.channel.send(client.config.errorMessages.bad_input_number);
        if(slowmode > 21600) return message.channel.send('Number must be less than or equal to 21,600 seconds');

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
        if(!channel.permissionsFor(message.member).has('MANAGE_CHANNEL')) return message.channel.send(client.config.errorMessages.channel_access_denied);
        if (!channel.permissionsFor(message.guild.me).has('MANAGE_CHANNEL')) return message.channel.send(client.config.errorMessages.my_channel_access_denied);

        if(slowmode < .5) {
            channel.setRateLimitPerUser(0);
        } else {
            channel.setRateLimitPerUser(slowmode);
        }

        const slowmodeEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} Set the slowmode for ${channel} to \`${client.util.convertMillisecondsToDuration(slowmode * 1000)}\``);

        return message.channel.send(slowmodeEmbed);
    }
}