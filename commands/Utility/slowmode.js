const Discord = require('discord.js')

module.exports = {
    name: 'slowmode',
    description: 'Set the slowmode for the channel',
    usage: 'slowmode [slowmode]\nslowmode [number] <channel>\nslowmode [channel]',
    aliases: ['sm', 'slow'],
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    async execute(client, message, args) {

        if (!args[0]) return message.reply(`The current slowmode is \`${client.util.duration(message.channel.rateLimitPerUser * 1000)}\``);
        const slowmode = Math.floor(args[0])
        if (!slowmode && slowmode != 0) return await client.util.throwError(message, client.config.errors.bad_input_number);
        if (slowmode > 21600) return await client.util.throwError(message, 'Number must be less than or equal to 21,600 seconds');

        const channel = client.util.getChannel(message.guild, args[1]) || message.channel;
        if (!channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS)) return await client.util.throwError(message, client.config.errors.my_channel_access_denied);

        if (slowmode < .5) {
            channel.setRateLimitPerUser(0);
        } else {
            channel.setRateLimitPerUser(slowmode);
        }

        const slowmodeEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} Set the slowmode for ${channel} to \`${slowmode > 0 ? client.util.duration(slowmode * 1000) : '0 seconds'}\``);

        return message.reply({ embeds: [slowmodeEmbed] });
    }
}
