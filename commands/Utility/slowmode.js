const Discord = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'slowmode',
    description: 'Set the slowmode for the channel',
    usage: 'slowmode\nslowmode [slowmode]\nslowmode [slowmode] <channel>',
    aliases: ['sm', 'slow'],
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    async execute(client, message, args) {
        if (!args[0])
            return message.reply(
                `The current slowmode is \`${client.util.duration(message.channel.rateLimitPerUser * 1000)}\``
            );
        let slowmode = args[0];
        if (!parseInt(slowmode) && parseInt(slowmode) !== 0)
            return client.util.throwError(message, 'an invalid slowmode was provided');

        if (!Math.round(slowmode) && parseInt(slowmode) !== 0) {
            if (!ms(slowmode.startsWith('+') || slowmode.startsWith('-') ? slowmode.slice(1) : slowmode))
                return client.util.throwError(message, 'an invalid slowmode was provided');
            else
                slowmode =
                    ms(slowmode.startsWith('+') || slowmode.startsWith('-') ? slowmode.slice(1) : slowmode) / 1000;
        } else if (slowmode.startsWith('+') || slowmode.startsWith('-'))
            slowmode = ms(slowmode.startsWith('+') || slowmode.startsWith('-') ? slowmode.slice(1) : slowmode);

        if (slowmode > 21600)
            return client.util.throwError(message, 'slowmode must be less than or equal to 21,600 seconds');

        const channel = client.util.getChannel(message.guild, args[1]) || message.channel;
        if (!channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS))
            return client.util.throwError(message, client.config.errors.my_channel_access_denied);

        if (args[0].startsWith('+')) slowmode = channel.rateLimitPerUser + parseInt(slowmode);
        else if (args[0].startsWith('-')) slowmode = channel.rateLimitPerUser - parseInt(slowmode);

        if (slowmode > 21600)
            return client.util.throwError(
                message,
                'the current slowmode + the slowmode increment exceeds the 21,600 second limit!'
            );

        let newChannelState;

        if (slowmode < 0.5) newChannelState = await channel.setRateLimitPerUser(0);
        else newChannelState = await channel.setRateLimitPerUser(parseInt(slowmode));

        const slowmodeEmbed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setDescription(
                `${client.config.emotes.success} Set the slowmode for ${channel} to \`${client.util.duration(
                    newChannelState.rateLimitPerUser * 1000
                )}\``
            );

        return message.reply({ embeds: [slowmodeEmbed] });
    }
};
