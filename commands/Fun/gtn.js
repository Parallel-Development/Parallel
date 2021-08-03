const Discord = require('discord.js')
const settingsSchema = require('../../schemas/settings-schema')
const cooldown = new Set()
const openedSession = new Set()

module.exports = {
    name: 'gtn',
    description: 'Game of Guess the Number!',
    usage: 'gtn',
    aliases: ['higherorlower', 'guessthenumber', 'hol'],
    async execute(client, message, args) {
        if (openedSession.has(message.author.id)) return;

        openedSession.add(message.author.id)
        const chosenNumber = Math.round(Math.random() * 1000);
        let tries = 0;
        const startDate = Date.now();
        let answered = false;
        message.reply('A number has been chosen `0-1000`. You have `8` tries and `60` seconds to guess! (You can run `.end` to cancel this minigame)');
        const filter = m => m.author.id === message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 60000, max: 8 });
        collector.on('collect', (message) => {

            if (cooldown.has(message.author.id)) return message.react('🕑')
            else {
                cooldown.add(message.author.id)
                setTimeout(() => {
                    cooldown.delete(message.author.id)
                }, 250)
            }

            if (message.content.startsWith('.end')) {
                message.reply(`ended! The number was \`${chosenNumber}\``)
                collector.stop();
                return answered = true;
            }

            if (parseInt(message.content) === NaN) return message.reply(client.config.errorMessages.bad_input_number);
            if (message.content > 1000 || message.content < 0) return message.reply('Number must be within the range of 0 to 1,000')

            tries++;

            if (message.content < chosenNumber) return message.reply('Higher!');
            if (message.content > chosenNumber) return message.reply('Lower!');
            if (message.content == chosenNumber) {
                const endDate = Date.now();
                const finishDate = (endDate - startDate) / 1000;
                message.reply(`Jackpot! You guessed the number in \`${tries}\` tries, and it took you around \`${Math.round(finishDate)}\` seconds`)
                answered = true;
                return collector.stop();
            }
        })

        collector.on('end', (collected, reason) => {
            openedSession.delete(message.author.id)
            if (answered) return;
            if (reason === 'time') {
                return message.reply(`You ran out of time! The number was \`${chosenNumber}\``)
            }
            if (reason === 'limit') {
                return message.reply(`You ran out of tries! The number was \`${chosenNumber}\``)
            }
        })
    }
}