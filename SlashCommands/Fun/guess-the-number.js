const Discord = require('discord.js');
const openedSession = new Set();

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'guess-the-number',
    description: 'A minigame of Guess the Number!',
    data: new SlashCommandBuilder()
        .setName('guess-the-number')
        .setDescription('A minigame of Guess the Number!')
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('The difficulty of the minigame')
                .addChoice('Easy', 'easy')
                .addChoice('Medium', 'medium')
                .addChoice('Hard', 'hard')
                .addChoice('Insane', 'insane')
                .addChoice('Extreme', 'extreme')
        ),
    async execute(client, interaction, args) {
        if (openedSession.has(interaction.user.id))
            return interaction.reply({ content: 'You already have an opened game ', ephemeral: true });

        const mode = args['mode'] || 'medium';

        let max = 0;
        let time = 0;

        if (mode === 'easy') (max = 10), (time = 60000);
        else if (mode === 'medium') (max = 8), (time = 60000);
        else if (mode === 'hard') (max = 6), (time = 40000);
        else if (mode === 'insane') (max = 3), (time = 20000);
        else if (mode === 'extreme') (max = 1), (time = 10000);
        else (max = 8), (time = 60000);

        openedSession.add(interaction.user.id);
        const chosenNumber = Math.floor(Math.random() * 1000);

        let tries = 0;
        const startTime = performance.now();
        let answered = false;
        interaction.reply(
            `A number has been chosen \`0-1000\`. You have ${`\`${max}\` ${
                max === 1 ? 'try' : 'tries'
            }`} and \`${client.util.duration(
                time
            )}\` to guess the number! (You can run \`cancel\` to cancel this minigame)`
        );
        const filter = m => m.author.id === interaction.user.id;
        const collector = new Discord.MessageCollector(interaction.channel, { time: time, filter: filter, max: max });
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
            openedSession.delete(interaction.user.id);
            if (answered) return;
            if (reason === 'time') {
                return interaction.followUp(`You ran out of time! The number was \`${chosenNumber}\``);
            }
            if (reason === 'limit') {
                return interaction.followUp(`You ran out of tries! The number was \`${chosenNumber}\``);
            }
        });
    }
};
