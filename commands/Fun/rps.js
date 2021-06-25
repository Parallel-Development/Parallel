const Discord = require('discord.js');
const requestCooldown = new Set();
const requestedCooldown = new Set();
let openedSession = new Set()

module.exports = {
    name: 'rps',
    description: 'Play someone in rock-paper-scissors',
    usage: 'rps <player>',
    async execute(client, message, args) {

        if(openedSession.has(message.author.id)) return message.channel.send('You are already in a game!')
       
        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        var member;
        var firstMember;

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }

        if(!member) return message.channel.send('Please specify a valid member | The member must be in the server')
        
        if(requestCooldown.has(message.author.id)) return message.channel.send('You already have a pending request! Please wait for it to expire before trying again');
        if(requestedCooldown.has(member.id)) return message.channel.send('This user already has a pending request! Please wait for their pending request to expire before trying again');
        if(!member) return message.channel.send('Please specify a user to play against')
        if(member.user.bot) return message.channel.send('You cannot play a bot!');
        if(member.id == message.author.id) return message.channel.send('Are you that lonely? Cmon, choose someone else');

        firstMember = message.member;
        
        requestCooldown.add(message.author.id);
        requestedCooldown.add(member.id);

        if(member !== message.guild.me) {
            message.channel.send(`${member}, ${message.member} would like to play you in rock-paper-scissors | Reply "play" to play, anything else to cancel`);
            let filter = m => m.author.id === member.id;
            const collector = new Discord.MessageCollector(message.channel, filter, { time: 30000 });
            collector.on('collect', async(message, col) => { 
                
                if(message.content.toLowerCase() == 'play') {
                    openedSession.add(message.author.id)
                    openedSession.add(member.id)
                    const gameBoardEmbed = new Discord.MessageEmbed()
                    .setColor('#09ff2')
                    .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                    .setDescription('Awaiting response from both users...')
                    .setFooter(`${firstMember.user.username} | ${member.user.username}`)
                    const gameBoard = await message.channel.send(gameBoardEmbed)

                    collector.stop();

                    const member1 = await firstMember.send('Please choose an option: Rock, Paper, or Scissors')
                    .catch(() => {
                        gameBoard.edit(new Discord.MessageEmbed()
                        .setColor('#09ff2')
                        .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                        .setDescription(`Game cancelled; ${firstMember.user.username} had their DM\'s off, please enable them to play`)
                        .setFooter(`${firstMember.user.username} | ${member.user.username}`))
                    })
                    const member2 = await member.send('Please choose an option: Rock, Paper, or Scissors')
                    .catch(() => {
                        gameBoard.edit(new Discord.MessageEmbed()
                        .setColor('#09ff2')
                        .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
                        .setDescription(`Game cancelled; ${member.user.username} had their DM\'s off, please enable them to play`)
                        .setFooter(`${firstMember.user.username} | ${member.user.username}`))
                    })

                    let filter1 = m => m.author.id == firstMember.id;
                    const collector1 = new Discord.MessageCollector(member1.channel, filter1, { time: 30000 })

                    let filter2 = m => m.author.id == member.id;
                    const collector2 = new Discord.MessageCollector(member2.channel, filter2, { time: 30000 })

                    const possibleAnswers = ['rock', 'paper', 'scissors'];
                    let tries1 = 0;
                    let tries2 = 0;

                    let user1option;
                    let user2option;

                    collector1.on('collect', async (message) => {
                        if (tries1 > 1) {
                            collector1.stop();
                            collector2.stop();

                            gameBoard.edit(new Discord.MessageEmbed()
                                .setColor('#09ff2')
                                .setDescription('Game cancelled; a user failed to input a valid option')
                                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL()));

                            return message.channel.send('Cancelled');
                        }
                        if (!possibleAnswers.includes(message.content.split(' ')[0].toLowerCase())) {
                            tries1++
                            return message.channel.send('Invalid option! Try again')
                        } else {
                            message.channel.send('Option collected!')
                            user1option = message.content.split(' ')[0].toLowerCase();
                            collector1.stop()
                            finish(firstMember, member, user1option, user2option, gameBoard, client, collector1, collector2);
                        }
                    })
                    collector2.on('collect', async (message) => {
                        if (tries2 > 1) {
                            collector1.stop();
                            collector2.stop();

                            gameBoard.edit(new Discord.MessageEmbed()
                                .setColor('#09ff2')
                                .setDescription('Game cancelled; a user failed to input a valid option')
                                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL()));

                            return message.channel.send('Cancelled');
                        }
                        if (!possibleAnswers.includes(message.content.split(' ')[0].toLowerCase())) {
                            tries2++
                            return message.channel.send('Invalid option! Try again')
                        } else {
                            message.channel.send('Option collected!')
                            user2option = message.content.split(' ')[0].toLowerCase();
                            collector2.stop();
                            finish(firstMember, member, user1option, user2option, gameBoard, client, collector1, collector2);
                        }
                    })


                    collector1.on('end', (col, reason) => {
                        if (reason == 'time') {
                            message.channel.send('No response in 30 seconds, cancelled');
                            collector1.stop();
                            collector2.stop();

                            gameBoard.edit(new Discord.MessageEmbed()
                                .setColor('#09ff2')
                                .setDescription('Game cancelled; did not receive user input in time')
                                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL()));
                            return;
                        }
                    })

                    collector2.on('end', (col, reason) => {
                        if (reason == 'time') {
                            message.channel.send('No response in 30 seconds, cancelled');
                            collector.stop();
                            collector1.stop();
                            collector2.stop();
                            gameBoard.edit(new Discord.MessageEmbed()
                                .setColor('#09ff2')
                                .setDescription('Game cancelled; did not receive user input in time')
                                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL()));
                            return;
                        }
                    })
                } else {
                    collector.stop();
                    return message.channel.send('Game cancelled')
                }
            })

            collector.on('end', (col, reason) => {
                requestCooldown.delete(message.author.id);
                requestedCooldown.delete(member.id)
                if(reason == 'time') {
                    return message.channel.send('Game offer expired; user did not respond in time')
                }
            })
        } 
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

    if(user1option && user2option) {

        if(collector1) collector1.stop();
        if(collector2) collector2.stop();

        let winner;
        if (user1option == 'rock' && user2option == 'scissors') winner = user1;
        if (user1option == 'rock' && user2option == 'paper') winner = user2;
        if (user1option == 'scissors' && user2option == 'rock') winner = user2;
        if (user1option == 'scissors' && user2option == 'paper') winner = user1;
        if (user1option == 'paper' && user2option == 'rock') winner = user1;
        if (user1option == 'paper' && user2option == 'scissors') winner = user2;

        if (!winner) winner = 'tie';

        if (winner == 'tie') {
            return gameBoard.edit(new Discord.MessageEmbed()
                .setColor('#09ff2')
                .setDescription(`Tie! Both users input **${user1option}**`)
                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL()))
        } else {
            return gameBoard.edit(new Discord.MessageEmbed()
                .setColor('#09ff2')
                .setDescription(`The winner is ${winner} | ${user1} input **${user1option}** and ${user2} input **${user2option}**`)
                .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL()))
        }
    }

}
