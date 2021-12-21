const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'rock-paper-scissors',
    description: 'Play someone in rock-paper-scissors',
    data: new SlashCommandBuilder()
        .setName('rock-paper-scissors')
        .setDescription('Play someone in a minigame of rock paper scissors')
        .addUserOption(option =>
            option.setName('member').setDescription('The member to play against').setRequired(true)
        ),
    async execute(client, interaction, args) {
        if (global.openedSession.has(interaction.user.id))
            return client.util.throwError(interaction, 'you are already in a game!');

        const playerOne = interaction.member;
        const playerTwo = await client.util.getMember(interaction.guild, args['member']);
        if (!playerTwo) return client.util.throwError(interaction, client.config.errors.invalid_member);

        if (global.requestCooldown.includes(interaction.user.id))
            return client.util.throwError(
                interaction,
                'You already have a pending request! Please wait for it to expire before trying again'
            );
        if (global.requestedCooldown.includes(playerTwo.id))
            return client.util.throwError(
                interaction,
                'This user already has a pending request! Please wait for their pending request to expire before trying again'
            );
        if (!playerTwo) return client.util.throwError(interaction, 'please specify a user to play against');
        if (playerTwo.user.bot) return client.util.throwError(interaction, 'you cannot play a bot!');
        if (playerTwo.id === interaction.user.id)
            return client.util.throwError(interaction, 'you cannot play yourself');

        global.requestCooldown.push(interaction.user.id);
        global.requestedCooldown.push(playerTwo.id);

        const joinButton = new Discord.MessageButton().setLabel('Play').setStyle('SUCCESS').setCustomId('join');
        const denyButton = new Discord.MessageButton().setLabel('Deny').setStyle('DANGER').setCustomId('deny');
        const join = new Discord.MessageActionRow().addComponents(joinButton, denyButton);

        interaction.reply({
            content: `${playerTwo}, ${playerOne} would like to play you in rock-paper-scissors | To play, hit the \`Play\` button below`,
            components: [join]
        });

        setTimeout(() => {

            if (interaction.replied) return;

            global.requestCooldown.splice(global.requestCooldown.indexOf(interaction.user.id), 1);
            global.requestedCooldown.splice(global.requestedCooldown.indexOf(playerTwo.id), 1);

            interaction
                .editReply({
                    content: 'The Rock Paper Scissors game request has been cancelled; no response from the user within 30 seconds',
                    components: []
                })
                .catch(() => {});
        }, 30000);

        return;
    }
};
