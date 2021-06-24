const Discord = require('discord.js')

module.exports = {
    name: 'clear',
    description: 'Clears messages in a channel',
    permissions: 'MANAGE_MESSAGES',
    moderationCommand: true,
    usage: 'clear <amount>\nclear <user> [amount]',
    aliases: ['purge'],
    async execute(client, message, args) {
        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to clear messages. Please give me the `Manage Messages` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        const badtime = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Please choose a number between 0-100')
            .setAuthor('Error', client.user.displayAvatarURL());

        const neednumber = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Please specify a number between 1 and 100')
            .setAuthor('Error', client.user.displayAvatarURL())
            .setFooter('The number must be an integer')

        const error = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Due to discord limiations, I cannot delete messages over 2 weeks old')
            .setFooter('Not the error? Check if I have perms to manage manages in this channel')

        if (!message.guild.me.hasPermission('MANAGE_MESSAGES')) return message.channel.send(missingperms);

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        if (!args[0]) return message.channel.send('Please specify how many messages you want to delete')

        var member;
        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        let amount = false;
        if(!member) amount = parseInt(args[0])

        if(member) {
            amount = parseInt(args[1])

            let deletedMessages = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Successfully deleted ${amount} messages`)
            .setAuthor('Messages Deleted', client.user.displayAvatarURL())

            if (amount > 100 || amount < 1) return message.channel.send(badtime)
            if (!amount) return message.channel.send(neednumber)
            await message.delete();
            message.channel.messages.fetch({
                limit: amount
            }).then(async(messages) => {
                let userMessages = []
                messages.filter(m => m.author.id == member.id).forEach(m => userMessages.push(m))
                message.channel.bulkDelete(userMessages)
                .catch(() => { return message.channel.send(error); })
                let delMessage = await message.channel.send(deletedMessages)

                setTimeout(async () => {
                    delMessage.delete().catch(() => { return });
                }, 5000)
            })
            return;
        }

        amount = parseInt(args[0])

        let deletedMessages = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Successfully deleted ${amount} messages`)
            .setAuthor('Messages Deleted', client.user.displayAvatarURL())

        if (amount > 100 || amount < 1) return message.channel.send(badtime)
        if (!amount) return message.channel.send(neednumber)

        try {
            await message.delete();
            message.channel.bulkDelete(amount, true)
            let delMessage = await message.channel.send(deletedMessages)

            setTimeout(async () => {
                delMessage.delete().catch(() => { return });
            }, 5000)
        } catch (err) {
            message.channel.send(error)
        }
    }
}
