const Discord = require('discord.js');

module.exports = {
    name: 'threads',
    description: 'Manage specific channel threads quickly and efficiently',
    usage: 'threads [option: archiveall, deleteall]\nthreads [option: archiveall, deleteall] <channel>',
    aliases: ['thread', 'threadmanager'],
    permissions: 'MANAGE_GUILD',
    async execute(client, message, args) {
        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_option);
        const option = args[0];
        if (!(option === 'archiveall' || option === 'deleteall')) return await client.util.throwError(message, client.config.errors.invalid_option);
        const channel = client.util.getChannel(message.guild, args[1]) || message.channel;
        if (channel.type !== 'GUILD_TEXT') return await client.util.throwError(message, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS)) return await client.util.throwError(message, 'You do not have permission to manage this channel');

        const threads = [...channel.threads.cache.values()];
        if (!threads.length) return await client.util.throwError(message, 'There are no threads in this channel');
        
        if (option === 'archiveall') {
            const archiving = await message.reply(`Archiving all threads in ${channel}...`)
            for (let i = 0; i !== threads.length; ++i) {
                const thread = threads[i];
                if (!thread.archived) thread.setArchived(true);
            }

            await archiving.edit(`${client.config.emotes.success} All threads in ${channel} have been archived`).catch(() => {});
        } else if (option === 'deleteall') {
            const deleting = await message.reply(`Deleting all threads in ${channel}...`)
            for (let i = 0; i !== threads.length; ++i) {
                const _thread = threads[i];
                if (!_thread.archived) _thread.delete()
            }

            await deleting.edit(`${client.config.emotes.success} All threads in ${channel} have been deleted`).catch(() => {});
        }
    }
}