const Discord = require('discord.js');
const requestCooldown = new Set();
const requestedCooldown = new Set();
const openedSession = new Set()

module.exports = {
    name: 'rps',
    description: 'Play someone in rock-paper-scissors',
    usage: 'rps [player]',
    async execute(client, message, args) {

        if (openedSession.has(message.author.id)) return await client.util.throwError(message, 'You are already in a game!')

        const playerOne = message.member;
        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_member);
        const playerTwo = await client.util.getMember(message.guild, args[0])
        if (!playerTwo) return await client.util.throwError(message, client.config.errors.invalid_member);

        if (requestCooldown.has(message.author.id)) return await client.util.throwError(message, 'You already have a pending request! Please wait for it to expire before trying again');
        if (requestedCooldown.has(playerTwo.id)) return await client.util.throwError(message, 'This user already has a pending request! Please wait for their pending request to expire before trying again');
        if (!playerTwo) return await client.util.throwError(message, 'Please specify a user to play against')
        if (playerTwo.user.bot) return await client.util.throwError(message, 'You cannot play a bot!');
        if (playerTwo.id === message.author.id) return await client.util.throwError(message, 'You cannot play yourself');

        requestCooldown.add(message.author.id);
        requestedCooldown.add(playerTwo.id);

        message.reply(`${playerTwo}, ${playerOne} would like to play you in rock-paper-scissors | Reply "play" to play, anything else to cancel`);
        const filter = p => p.author.id === playerTwo.id;
        const collector = new Discord.MessageCollector(message.channel, { filter: filter, time: 30000 });
        collector.on('collect', async (message, col) => {

            if (message.content.toLowerCase() === 'play') {
                openedSession.add(message.author.id)
                openedSession.add(playerTwo.id)
                const gameBoardEmbed = new Discord.MessageEmbed()
                    .setColor(client.config.colors.main)
                    .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                    .setDescription('Awaiting response from both users...')
                    .setFooter(`${playerOne.user.username} | ${playerTwo.user.username}`)
                const gameBoard = await message.reply({ embeds: [gameBoardEmbed] })

                collector.stop();
                let error = false;

                const member1 = await playerOne.send('Please choose an option: Rock, Paper, or Scissors')
                    .catch(() => {
                        error = true;
                        openedSession.delete(playerOne.id)
                        return gameBoard.edit({ embeds: [
                            new Discord.MessageEmbed()
                                .setColor(client.config.colors.main)
                                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                                .setDescription(`Game cancelled; ${playerOne.user.username} had their DM\'s off, please enable them to play`)
                                .setFooter(`${playerOne.user.username} | ${playerTwo.user.username}`)
                        ]})
                    })
                    if (error) return;
                const member2 = await playerTwo.send('Please choose an option: Rock, Paper, or Scissors')
                    .catch(() => {
                        error = true;
                        openedSession.delete(playerOne.id)
                        return gameBoard.edit({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.config.colors.main)
                                    .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                                    .setDescription(`Game cancelled; ${playerTwo.user.username} had their DM\'s off, please enable them to play`)
                                    .setFooter(`${playerOne.user.username} | ${playerTwo.user.username}`)
                            ]
                        })
                    })
                    if (error) return;

                const filter1 = m => m.author.id === playerOne.id;
                const collector1 = new Discord.MessageCollector(member1.channel, { filter: filter1, time: 30000 })

                let filter2 = m => m.author.id === playerTwo.id;
                const collector2 = new Discord.MessageCollector(member2.channel, { filter: filter2, time: 30000 })

                const possibleAnswers = ['rock', 'paper', 'scissors'];
                let tries1 = 0;
                let tries2 = 0;

                let user1option;
                let user2option;

                collector1.on('collect', async (message) => {
                    if (tries1 > 2) {
                        openedSession.delete(playerOne.id)
                        collector1.stop();
                        collector2.stop();

                        gameBoard.edit({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.config.colors.main)
                                    .setDescription('Game cancelled; a user failed to input a valid option')
                                    .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                            ]
                        })

                        return message.reply('Cancelled');
                    }
                    if (!possibleAnswers.includes(message.content.split(' ')[0].toLowerCase())) {
                        tries1++
                        return await client.util.throwError(message, client.config.errors.invalid_option + 'Try again')
                    } else {
                        message.reply('Option collected!')
                        user1option = message.content.split(' ')[0].toLowerCase();
                        collector1.stop()
                        finish(playerOne, playerTwo, user1option, user2option, gameBoard, client, collector1, collector2);
                    }
                })
                collector2.on('collect', async (message) => {
                    if (tries2 > 2) {
                        collector1.stop();
                        collector2.stop();

                        gameBoard.edit({ embeds: [
                            new Discord.MessageEmbed()
                                .setColor(client.config.colors.main)
                                .setDescription('Game cancelled; a user failed to input a valid option')
                                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                        ]})

                        return message.reply('Cancelled');
                    }
                    if (!possibleAnswers.includes(message.content.split(' ')[0].toLowerCase())) {
                        tries2++
                        return await client.util.throwError(message, client.config.errors.invalid_option + 'Try again');
                    } else {
                        message.reply('Option collected!')
                        user2option = message.content.split(' ')[0].toLowerCase();
                        collector2.stop();
                        finish(playerOne, playerTwo, user1option, user2option, gameBoard, client, collector1, collector2);
                    }
                })


                collector1.on('end', (col, reason) => {
                    if (reason === 'time') {

                        openedSession.delete(playerOne.id)

                        message.reply('No response in 30 seconds, cancelled');
                        collector1.stop();
                        collector2.stop();

                        return gameBoard.edit({ embeds: [
                            new Discord.MessageEmbed()
                                .setColor(client.config.colors.main)
                                .setDescription('Game cancelled; did not receive user input in time')
                                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                        ] })
                    }
                })

                collector2.on('end', (col, reason) => {
                    if (reason === 'time') {

                        openedSession.delete(playerTwo.id)

                        message.reply('No response in 30 seconds, cancelled');
                        collector.stop();
                        collector1.stop();
                        collector2.stop();
                        return gameBoard.edit({ embeds: [
                            new Discord.MessageEmbed()
                                .setColor(client.config.colors.main)
                                .setDescription('Game cancelled; did not receive user input in time')
                                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                        ] })
                    }
                })
            } else {
                collector.stop();
                return message.reply('Game cancelled')
            }
        })

        collector.on('end', (col, reason) => {
            requestCooldown.delete(message.author.id);
            requestedCooldown.delete(playerTwo.id)
            if (reason === 'time') {
                return message.reply('Game offer expired; user did not respond in time')
            }
        })
    }
}

/**
 * @param { User } user1 - The user who requested to play RPS | Used to show who won the game
 * @param { User } user2 - The user who requested was requested to play RPS | Used to show who won the game
 * @param { String } user1option - The option that user1 picked
 * @param { String } user2option - The option that user2 picked
 * @param { Discord.MessageEmbed } gameBoard - The Discord embed showing the game status
 * @param { Discord.Client} client - The Discord Client, imported to show the client's avatar in the embed author
 * @param { Discord.MessageCollector } collector1 - The message collector that catches the option for user1
 * @param { Discord.MessageCollector } collector2 - The message collector that catches the option for user2
 * @returns { Discord.MessageEmbed } - Edits the game board to show the ending status of the game board
 */

function finish(user1, user2, user1option, user2option, gameBoard, client, collector1, collector2) {

    openedSession.delete(user1.id)
    openedSession.delete(user2.id)

    if (user1option && user2option) {

        if (collector1) collector1.stop();
        if (collector2) collector2.stop();

        let winner;
        if (user1option === 'rock' && user2option === 'scissors') winner = user1;
        if (user1option === 'rock' && user2option === 'paper') winner = user2;
        if (user1option === 'scissors' && user2option === 'rock') winner = user2;
        if (user1option === 'scissors' && user2option === 'paper') winner = user1;
        if (user1option === 'paper' && user2option === 'rock') winner = user1;
        if (user1option === 'paper' && user2option === 'scissors') winner = user2;

        if (!winner) winner = 'tie';

        const winnerEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
        winner === 'tie' ? winnerEmbed.setDescription(`Tie! Both users input **${user1option}**`) : winnerEmbed.setDescription(`The winner is ${winner} | ${user1} input **${user1option}** and ${user2} input **${user2option}**`)

        return gameBoard.edit({ embeds: [winnerEmbed] })
    }

}