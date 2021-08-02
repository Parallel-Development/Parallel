const Discord = require('discord.js')

module.exports = {
    name: 'clear',
    description: 'Clears messages in a channel',
    permissions: 'MANAGE_MESSAGES',
    requiredBotPermission: 'MANAGE_MESSAGES',
    usage: 'clear [amount]\nclear <amount> [user]',
    aliases: ['purge', 'prune'],
    async execute(client, message, args) {

        if (!message.channel.permissionsFor(message.member).has('MANAGE_MESSAGES')) return message.channel.send(client.config.errorMessages.channel_access_denied); if (!message.channel.permissionsFor(message.member).has('MANAGE_MESSAGES')) return message.channel.send(client.config.errorMessages.channel_access_denied);
        if (!message.channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')) return message.channel.send(client.config.errorMessages.my_channel_access_denied);


        if(!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_amount);
        const amount = parseInt(args[0]);
        if(!amount) return message.channel.send(client.config.errorMessages.bad_input_number);
        if(amount > 100 || amount < 1) return message.channel.send('Number must a number between 1-100');

        const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => {});
        await message.delete();
        
        if(user) {
            const userMessages = [];
            const _messages = await message.channel.messages.fetch({ limit: 100 });
            const messages = [..._messages.values()]
            for(var i = 0; i !== messages.length && userMessages.length !== amount; ++i) {
                const msg = messages[i];
                if(msg.author === user) userMessages.push(msg);
            }

            await message.channel.bulkDelete(userMessages, true);
            const bulkDeleteEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Successfully purged \`${amount}\` messages from ${user}`);
            const bulkDeleteMessage = await message.channel.send(bulkDeleteEmbed)
            setTimeout(() => { bulkDeleteMessage.delete() }, 3000);
        } else {
            await message.channel.bulkDelete(amount, true);
            const _bulkDeleteEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Successfully purged \`${amount}\` messages`);
            const _bulkDeleteMessage = await message.channel.send(_bulkDeleteEmbed)
            setTimeout(() => { _bulkDeleteMessage.delete() }, 3000);
        }

    }
}