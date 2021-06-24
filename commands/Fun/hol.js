const Discord = require('discord.js')
const settingsSchema = require('../../schemas/settings-schema')
let talkedRecently = new Set()

module.exports = {
    name: 'hol',
    description: 'Game of Guess the Number!',
    usage: 'hol',
    aliases: ['higherorlower', 'guessthenumber', 'gtn'],
    async execute(client, message, args) {
        const prefixSetting = await settingsSchema.findOne({
            guildid: message.guild.id
        })

        const chosenNumber = Math.round(Math.random() * 1000);
        let tries = 0;
        const startDate = new Date().getTime();
        let answered = false;
        message.channel.send('A number has been chosen `0-1000`. You have `10` tries and `60` seconds to guess! (You can run `.end` to cancel this minigame)');
        let filter = m => m.author.id == message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 60000, max: 10 });
        collector.on('collect', (message) => {

            if (talkedRecently.has(message.author.id)) return message.react('🕑')
            else {
                talkedRecently.add(message.author.id)
                setTimeout(() => {
                    talkedRecently.delete(message.author.id)
                }, 250)
            }

            if (message.content.startsWith('.end')) {
                message.reply(`ended! The number was \`${chosenNumber}\``)
                collector.stop();
                answered = true;
                return;
            }

            const { prefix } = prefixSetting
            if (message.content.startsWith(`${prefix}hol`) || message.content.startsWith(`${prefix}gtn`) || message.content.startsWith(`${prefix}guessthenumber`) || message.content.startsWith(`${prefix}higherorlower`)) {
                collector.stop();
                message.channel.send('Minigame ended since you started a new one')
                return;
            }

            tries++;

            if (isNaN(message.content)) return message.channel.send('This isn\'t even a number :/')
            if (message.content > 1000 || message.content < 0) return message.channel.send('bruv I said between 0-1000')
            if (message.content < chosenNumber) return message.channel.send('Higher!');
            if (message.content > chosenNumber) return message.channel.send('Lower!');
            if (message.content == chosenNumber) {
                const endDate = new Date().getTime();
                const finishDate = (endDate - startDate) / 1000;
                message.channel.send(`Jackpot! You guessed the number in \`${tries}\` tries, and it took you around \`${Math.round(finishDate)}\` seconds`)
                answered = true;
                collector.stop();
                return;
            }
        })

        collector.on('end', (collected, reason) => {
            if (answered) return;
            if (reason == 'time') {
                message.channel.send(`You ran out of time! The number was \`${chosenNumber}\``)
                return;
            }
            if (reason == 'limit') {
                message.channel.send(`You ran out of tries! The number was \`${chosenNumber}\``)
                return;
            }
        })
    }
}
