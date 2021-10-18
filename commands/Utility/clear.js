const Discord = require('discord.js')

module.exports = {
    name: 'clear',
    description: 'Clears messages in a channel',
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    usage: 'clear [amount]\nclear [amount] <user>',
    aliases: ['purge', 'prune'],
    async execute(client, message, args) {

        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_amount);
        const amount = parseInt(args[0]);
        if (!amount) return client.util.throwError(message, client.config.errors.bad_input_number);
        if (amount > 100 || amount < 1) return client.util.throwError(message, 'Number must a number between 1-100');
        if (!message.channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);
        await message.delete();

        const user = await client.util.getUser(client, args[1]);
        
        if (user) {

            let purgedMessages = 0;
            while(purgedMessages < amount) {
                const userMessages = [];
                const _messages = await message.channel.messages.fetch({ limit: 100 })
                const messages = [..._messages.values()];
                if (!messages.length) break;
                for (let i = 0; i !== messages.length && userMessages.length !== amount - purgedMessages; ++i) {
                    const msg = messages[i];
                    if (msg.author === user) userMessages.push(msg);
                }
                const deletedMessages = await message.channel.bulkDelete(userMessages, true).catch(() => {});
                if (!deletedMessages.size) break;
                purgedMessages += deletedMessages.size;
            }

            if (!purgedMessages) return message.channel.send('Deleted 0 messages; either failed to fetch any messages from the user, or the messages were too old to be bulk deleted')
            const bulkDeleteEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`${client.config.emotes.success} Successfully purged \`${purgedMessages}\` ${purgedMessages === 1 ? 'message' : 'messages'} from ${user}`);
            const bulkDeleteMessage = await message.channel.send({ embeds: [bulkDeleteEmbed] })
            setTimeout(() => { bulkDeleteMessage.delete() }, 5000);
        } else {
            const deletedAmount = await message.channel.bulkDelete(amount, true);
            if (!deletedAmount.size) return message.channel.send('Deleted 0 messages; either there are no messages in this channel or the messages are too old')
            const _bulkDeleteEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`${client.config.emotes.success} Successfully purged \`${deletedAmount.size}\` ${deletedAmount.size === 1 ? 'message' : 'messages'}`);
            const _bulkDeleteMessage = await message.channel.send({ embeds: [_bulkDeleteEmbed] })
            setTimeout(() => { _bulkDeleteMessage.delete() }, 5000);
        }

    }
}
