const Discord = require('discord.js');
const openedSession = new Set();

module.exports = {
    name: 'guess-the-number',
    description: 'Game of Guess the Number!',
    usage: 'guess-the-number\nguess-the-number [mode]\n\nmodes: `easy`, `medium`, `hard`, `insane`, `extreme`\n\nBy default, the mode is `normal`',
    aliases: ['higher-or-lower', 'gtn', 'hol'],
    async execute(client, message, args) {
        if (openedSession.has(message.author.id)) return;

        const mode = args[0]?.toLowerCase() ?? 'medium';

        let max = 0;
        let time = 0;

        if (mode === 'easy') (max = 10), (time = 60000);
        else if (mode === 'medium') (max = 8), (time = 60000);
        else if (mode === 'hard') (max = 6), (time = 40000);
        else if (mode === 'insane') (max = 3), (time = 20000);
        else if (mode === 'extreme') (max = 1), (time = 10000);
        else (max = 8), (time = 60000);

        openedSession.add(message.author.id);
        const chosenNumber = Math.floor(Math.random() * 1000);

        let tries = 0;
        const startTime = performance.now();
        let answered = false;
        message.reply(
            `A number has been chosen \`0-1000\`. You have ${`\`${max}\` ${
                max === 1 ? 'try' : 'tries'
            }`} and \`${client.util.duration(
                time
            )}\` to guess the number! (You can run \`cancel\` to cancel this minigame)`
        );
        const filter = m => m.author.id === message.author.id;
        const collector = new Discord.MessageCollector(message.channel, { time: time, filter: filter, max: max });
        collector.on('collect', async message => {
            if (message.content.startsWith('cancel')) {
                message.reply(`Ended! The number was \`${chosenNumber}\``);
                collector.stop();
                return (answered = true);
            }

            if (!parseInt(message.content) && parseInt(message.content) !== 0)
                return client.util.throwError(message, client.config.errors.bad_input_number);
            if (parseInt(message.content) > 1000 || parseInt(message.content) < 0)
                return message.reply('Number must be within the range of 0 to 1,000');

            tries++;

            if (tries < max) {
                if (parseInt(message.content) < chosenNumber) return message.reply('Higher!');
                if (parseInt(message.content) > chosenNumber) return message.reply('Lower!');
            }

            if (parseInt(message.content) == chosenNumber) {
                message.reply(
                    `Jackpot! You guessed the number in ${`\`${tries}\` ${
                        tries === 1 ? 'try' : 'tries'
                    }`} and it took you around \`${client.util.duration(Math.floor(performance.now() - startTime))}\``
                );
                answered = true;
                return collector.stop();
            }
        });

        collector.on('end', (collected, reason) => {
            openedSession.delete(message.author.id);
            if (answered) return;
            if (reason === 'time') {
                return message.reply(`You ran out of time! The number was \`${chosenNumber}\``);
            }
            if (reason === 'limit') {
                return message.reply(`You ran out of tries! The number was \`${chosenNumber}\``);
            }
        });
    }
};
