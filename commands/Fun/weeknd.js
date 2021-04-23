const Discord = require('discord.js')

module.exports = {
    name: 'weeknd',
    description: 'The Weeknd',
    usage: 'weeknd',
    depricated: true,
    async execute(client, message, args) {
        const msg = await message.channel.send('Are you a fan of the weeknd? [y/n]');
        let filter = m => m.author.id == message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 60000 })
        collector.on('collect', async(message) => {
            if(message.content == 'yes' || message.content == 'y') {
                message.delete()
                msg.edit('Nice bro, same')
                collector.stop()
                setTimeout(() => {
                    msg.delete()
                }, 2000)
                return;
            } else if(message.content == 'no' || message.content == 'n') {
                message.delete()
                msg.edit('Ok, bye')
                collector.stop()
                setTimeout(() => {
                    msg.delete()
                }, 2000)
                return;
            } else {
                message.delete()
                msg.edit('That is not a valid answer. Please respond either yes or no')
            }
        })
    }
}