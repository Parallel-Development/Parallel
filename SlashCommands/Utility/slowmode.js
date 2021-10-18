const Discord = require('discord.js');
const ms = require('ms');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'slowmode',
    description: 'Set the slowmode for the channel',
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    data: new SlashCommandBuilder().setName('slowmode').setDescription('Set the slowmode for the channel')
    .addStringOption(option => option.setName('slowmode').setDescription('The slowmode to set the slowmode to'))
    .addChannelOption(option => option.setName('channel').setDescription('The channel to set the slowmode in')),
    async execute(client, interaction, args) {

        if (!args['slowmode']) return interaction.reply(`The current slowmode is \`${client.util.duration(interaction.channel.rateLimitPerUser * 1000)}\``);
        let slowmode = args['slowmode'];
        if (!parseInt(slowmode) && parseInt(slowmode) !== 0) return client.util.throwError(interaction, 'an invalid slowmode was provided');

        if (!Math.round(slowmode) && parseInt(slowmode) !== 0) {
            if (!ms((slowmode.startsWith('+') || slowmode.startsWith('-')) ? slowmode.slice(1) : slowmode)) return client.util.throwError(interaction, 'an invalid slowmode was provided');
            else slowmode = ms((slowmode.startsWith('+') || slowmode.startsWith('-')) ? slowmode.slice(1) : slowmode) / 1000;
        } else if (slowmode.startsWith('+') || slowmode.startsWith('-')) slowmode = ms((slowmode.startsWith('+') || slowmode.startsWith('-')) ? slowmode.slice(1) : slowmode);

        if (slowmode > 21600) return client.util.throwError(interaction, 'slowmode must be less than or equal to 21,600 seconds');

        const channel = client.util.getChannel(interaction.guild, args['channel']) || interaction.channel;
        if (!channel.permissionsFor(interaction.guild.me).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS)) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);

        if (args['slowmode'].startsWith('+')) slowmode = channel.rateLimitPerUser + parseInt(slowmode);
        else if (args['slowmode'].startsWith('-')) slowmode = channel.rateLimitPerUser - parseInt(slowmode);

        if (slowmode > 21600) return client.util.throwError(interaction, 'the current slowmode + the slowmode increment exceeds the 21,600 second limit!');

        if (slowmode < .5) channel.setRateLimitPerUser(0); 
        else channel.setRateLimitPerUser(slowmode);

        const slowmodeEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`✅ Set the slowmode for ${channel} to \`${slowmode >= 0 ? client.util.duration(slowmode * 1000) : '0 seconds'}\``);

        return interaction.reply({ embeds: [slowmodeEmbed] });
    }
}