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
            return client.util.throwError(interaction, 'You are already in a game!');

        const playerOne = interaction.member;
        const playerTwo = await client.util.getMember(interaction.guild, args['member']);
        if (!playerTwo) return client.util.throwError(interaction, client.config.errors.invalid_member);

        if (global.requestCooldown.has(interaction.user.id))
            return client.util.throwError(
                interaction,
                'You already have a pending request! Please wait for it to expire before trying again'
            );
        if (global.requestedCooldown.has(playerTwo.id))
            return client.util.throwError(
                interaction,
                'This user already has a pending request! Please wait for their pending request to expire before trying again'
            );
        if (!playerTwo) return client.util.throwError(interaction, 'Please specify a user to play against');
        if (playerTwo.user.bot) return client.util.throwError(interaction, 'You cannot play a bot!');
        if (playerTwo.id === interaction.user.id)
            return client.util.throwError(interaction, 'You cannot play yourself');

        global.requestCooldown.add(interaction.user.id);
        global.requestedCooldown.add(playerTwo.id);

        const joinButton = new Discord.MessageButton().setLabel('Play').setStyle('SUCCESS').setCustomId('join');
        const denyButton = new Discord.MessageButton().setLabel('Deny').setStyle('DANGER').setCustomId('deny');
        const join = new Discord.MessageActionRow().addComponents(joinButton, denyButton);

        interaction.reply({
            content: `${playerTwo}, ${playerOne} would like to play you in rock-paper-scissors | To play, hit the \`Play\` button below`,
            components: [join]
        });

        setTimeout(() => {
            const joinButton_ = new Discord.MessageButton()
                .setLabel('Play')
                .setStyle('SUCCESS')
                .setCustomId('join')
                .setDisabled(true);
            const denyButton_ = new Discord.MessageButton()
                .setLabel('Deny')
                .setStyle('DANGER')
                .setCustomId('deny')
                .setDisabled(true);
            const join_ = new Discord.MessageActionRow().addComponents(joinButton_, denyButton_);

            global.requestCooldown.delete(interaction.user.id);
            global.requestedCooldown.delete(playerTwo.id);

            interaction
                .editReply({
                    content: `${playerTwo}, ${playerOne} would like to play you in rock-paper-scissors | To play, hit the \`Play\` button below\n\nThis request has expired`,
                    components: [join_]
                })
                .catch(() => {});
        }, 30000);

        return;
    }
};
