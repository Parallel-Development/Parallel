const Discord = require('discord.js');
const requestCooldown = new Set();
const requestedCooldown = new Set();
const openedSession = new Set()

module.exports = {
    name: 'rps',
    description: 'Play someone in rock-paper-scissors',
    usage: 'rps [player]',
    async execute(client, message, args) {

        if (global.openedSession.has(message.author.id)) return client.util.throwError(message, 'You are already in a game!')

        const playerOne = message.member;
        const playerTwo = await client.util.getMember(message.guild, args[0])
        if (!playerTwo) return client.util.throwError(message, client.config.errors.invalid_member);

        if (global.requestCooldown.has(message.author.id)) return client.util.throwError(message, 'You already have a pending request! Please wait for it to expire before trying again');
        if (global.requestedCooldown.has(playerTwo.id)) return client.util.throwError(message, 'This user already has a pending request! Please wait for their pending request to expire before trying again');
        if (!playerTwo) return client.util.throwError(message, 'Please specify a user to play against')
        if (playerTwo.user.bot) return client.util.throwError(message, 'You cannot play a bot!');
        if (playerTwo.id === message.author.id) return client.util.throwError(message, 'You cannot play yourself');

        global.requestCooldown.add(message.author.id);
        global.requestedCooldown.add(playerTwo.id);

        const joinButton = new Discord.MessageButton().setLabel('Play').setStyle('SUCCESS').setCustomId('join');
        const denyButton = new Discord.MessageButton().setLabel('Deny').setStyle('DANGER').setCustomId('deny');
        const join = new Discord.MessageActionRow().addComponents(joinButton, denyButton);

        message.reply({ content: `${playerTwo}, ${playerOne} would like to play you in rock-paper-scissors | To play, hit the \`Play\` button below`, components: [join] });

        setTimeout(() => { 
            const joinButton_ = new Discord.MessageButton().setLabel('Play').setStyle('SUCCESS').setCustomId('join').setDisabled(true);
            const denyButton_ = new Discord.MessageButton().setLabel('Deny').setStyle('DANGER').setCustomId('deny').setDisabled(true);
            const join_ = new Discord.MessageActionRow().addComponents(joinButton_, denyButton_);

            global.requestCooldown.delete(message.author.id);
            global.requestedCooldown.delete(playerTwo.id);

            message.edit({ content: `${playerTwo}, ${playerOne} would like to play you in rock-paper-scissors | To play, hit the \`Play\` button below\n\nThis request has expired`, components: [join_] }).catch(() => {});
        }, 30000)

        return;
    }
}