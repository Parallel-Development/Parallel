const Discord = require('discord.js')

module.exports = {
    name: 'clear',
    description: 'Clears messages in a channel',
    usage: 'clear <amount>',
    aliases: ['purge'],
    async execute(client, message, args) {
        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to clear messages. Please give me the `Manage Messages` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

        const badtime = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Please choose a number between 1-100')
            .setAuthor('Error', client.user.displayAvatarURL());

        const neednumber = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Please specify a number between 1 and 100')
            .setAuthor('Error', client.user.displayAvatarURL())
            .setFooter('The number must be an integer')


        if (!message.member.hasPermission('MANAGE_ROLES')) return message.channel.send(accessdenied);
        if (!message.guild.me.hasPermission('MANAGE_ROLES')) return message.channel.send(missingperms);

        var amount = parseFloat(args[0])

        if (amount > 100) return message.channel.send(badtime)
        if (amount < 1) return message.channel.send(badtime)
        if (!amount) return message.channel.send(neednumber)

        const deletedmessages = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Successfully deleted ${amount} messages`)
            .setAuthor('Messages Deleted', client.user.displayAvatarURL())

        const error = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Due to discord limiations, I cannot delete messages over 2 weeks old')

        try {
            message.channel.bulkDelete(amount, true)
            let delMessage = await message.channel.send(deletedmessages)

            setTimeout(async () => {
                delMessage.delete();
            }, 5000)
        } catch (err) {
            message.channel.send(error)
        }
    }
}
