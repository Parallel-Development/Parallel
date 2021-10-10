const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'thread-manager',
    description: 'Manage specific channel threads quickly and efficiently',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    data: new SlashCommandBuilder().setName('thread-manager').setDescription('Manage specific channel threads quickly and efficiently')
    .addStringOption(option => option.setName('choice').setDescription('To archive all or delete all?').setRequired(true).addChoice('Archive All', 'archive').addChoice('Delete All', 'delete').setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('The channel to manage threads in')),
    async execute(client, interaction, args) {
  
        let channel = client.util.getChannel(interaction.guild, args['channel']) || interaction.channel;
        if (channel.type.endsWith('THREAD')) channel = channel.parent;
        const option = args['choice'];
        if (!channel.isText()) return client.util.throwError(interaction, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(interaction.member).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS)) return client.util.throwError(interaction, 'You do not have permission to manage this channel');

        const threads = [...channel.threads.cache.values()];
        if (!threads.length) return client.util.throwError(interaction, 'There are no threads in this channel');

        await interaction.deferReply();
        
        if (option === 'archive') {
            for (let i = 0; i !== threads.length; ++i) {
                const thread = threads[i];
                if (!thread.archived) await thread.setArchived(true);
            }

            await interaction.editReply(`Successfully archived all threads in ${channel}`).catch(() => {});
        } else if (option === 'delete') {
            for (let i = 0; i !== threads.length; ++i) {
                const _thread = threads[i];
                if (!_thread.archived) await _thread.delete();
            }

            await interaction.editReply(`Successfully deleted all threads in ${channel}`).catch(() => {})
        }
    }
}