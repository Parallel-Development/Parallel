const Discord = require('discord.js');
const requestCooldown = new Set();
const requestedCooldown = new Set();
const openedSession = new Set();

module.exports = {
    name: 'rock-paper-scissors',
    description: 'Play someone in rock-paper-scissors',
    usage: 'rock-paper-scissors [player]',
    aliases: ['rps'],
    async execute(client, message, args) {
        if (global.openedSession.has(message.author.id))
            return client.util.throwError(message, 'you are already in a game!');

        const playerOne = message.member;
        const playerTwo = await client.util.getMember(message.guild, args[0]);
        if (!playerTwo) return client.util.throwError(message, client.config.errors.invalid_member);

        if (global.requestCooldown.includes(message.author.id))
            return client.util.throwError(
                message,
                'You already have a pending request! Please wait for it to expire before trying again'
            );
        if (global.requestedCooldown.includes(playerTwo.id))
            return client.util.throwError(
                message,
                'This user already has a pending request! Please wait for their pending request to expire before trying again'
            );
        if (!playerTwo) return client.util.throwError(message, 'please specify a user to play against');
        if (playerTwo.user.bot) return client.util.throwError(message, 'you cannot play a bot!');
        if (playerTwo.id === message.author.id) return client.util.throwError(message, 'you cannot play yourself');

        global.requestCooldown.push(message.author.id);
        global.requestedCooldown.push(playerTwo.id);

        const joinButton = new Discord.MessageButton().setLabel('Play').setStyle('SUCCESS').setCustomId('join');
        const denyButton = new Discord.MessageButton().setLabel('Deny').setStyle('DANGER').setCustomId('deny');
        const join = new Discord.MessageActionRow().addComponents(joinButton, denyButton);

        const msg = await message.reply({
            content: `${playerTwo}, ${playerOne} would like to play you in rock-paper-scissors | To play, hit the \`Play\` button below`,
            components: [join]
        });

        setTimeout(() => {
            if (msg.editedTimestamp) return;

            global.requestCooldown.splice(global.requestCooldown.indexOf(message.author.id), 1);
            global.requestedCooldown.splice(global.requestedCooldown.indexOf(playerTwo.id), 1);

            msg.edit({
                content:
                    'The Rock Paper Scissors game request has been cancelled; no response from the user within 30 seconds',
                components: []
            }).catch(() => {});
        }, 30000);

        return;
    }
};
