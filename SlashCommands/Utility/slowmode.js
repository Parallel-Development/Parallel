const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'slowmode',
    description: 'Set the slowmode for the channel',
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    data: new SlashCommandBuilder().setName('slowmode').setDescription('Set the slowmode for the channel')
    .addIntegerOption(option => option.setName('seconds').setDescription('The seconds to set the slowmode to'))
    .addChannelOption(option => option.setName('channel').setDescription('The channel to set the slowmode in')),
    async execute(client, interaction, args) {

        const slowmode = Math.floor(args['seconds']);
        const channel = interaction.guild.channels.cache.get(args['channel']) || interaction.channel;
        if(!channel.isText() && !channel.type.endsWith('THREAD')) return client.util.throwError(interaction, client.config.errors.not_type_text_channel)
        if(!slowmode && slowmode !== 0) return interaction.reply(`The current slowmode for ${channel} is set at \`${channel.rateLimitPerUser} seconds\``)
        if (slowmode > 21600) return client.util.throwError(interaction, 'Number must be less than or equal to 21,600 seconds');
        if (!channel.permissionsFor(interaction.guild.me).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS)) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);

        if (slowmode < .5) {
            channel.setRateLimitPerUser(0);
        } else {
            channel.setRateLimitPerUser(slowmode);
        }

        const slowmodeEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`✅ Set the slowmode for ${channel} to \`${slowmode > 0 ? client.util.duration(slowmode * 1000) : '0 seconds'}\``);

        return interaction.reply({ embeds: [slowmodeEmbed] });
    }
}