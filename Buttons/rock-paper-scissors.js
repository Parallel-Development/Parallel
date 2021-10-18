const Discord = require('discord.js');

module.exports.run = async(client, interaction) => {

    const gameStarter = await client.util.getMember(interaction.guild, interaction.message.interaction?.user.id) || interaction.channel.messages.cache.get(interaction.message.reference.messageId).member;

    const joinButton = new Discord.MessageButton().setLabel('Play').setStyle('SUCCESS').setCustomId('join').setDisabled(true);
    const denyButton = new Discord.MessageButton().setLabel('Deny').setStyle('DANGER').setCustomId('deny').setDisabled(true);

    const join = new Discord.MessageActionRow().addComponents(joinButton, denyButton);

    if (Date.now() - interaction.message.createdAt > 30000) {
        interaction.message.edit({ content: interaction.message.content, components: [join] })
        return client.util.throwError(interaction, 'This request has already expired');
    }

    let requested = interaction.message.content.split(' ')[0].replace(',', '');
    if (requested.startsWith('<@') && requested.endsWith('>')) {
        requested = requested.slice(2, -1);
        if (requested.startsWith('!')) requested = requested.slice(1);
    }

     if (interaction.user.id !== requested) return client.util.throwError(interaction, client.config.errors.no_button_access);

    if (interaction.customId === 'deny') {
        
        global.requestCooldown.delete(interaction.user.id);
        global.requestedCooldown.delete(requested);

        await interaction.reply('The request was denied by the requested user');
        return interaction.message.edit({ content: interaction.message.content + '\n\nThis request has expired', components: [join] });
    }

    interaction.message.edit({ content: interaction.message.content, components: [join] });

    global.openedSession.add(gameStarter.user.id);
    global.openedSession.add(requested);

    const gameBoard = new Discord.MessageEmbed()
    .setColor(client.config.colors.main)
    .setDescription('Awaiting response from both users...')
    .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())

    const rockButton = new Discord.MessageButton().setLabel('Rock').setStyle('DANGER').setCustomId('rock');
    const paperButton = new Discord.MessageButton().setLabel('Paper').setStyle('PRIMARY').setCustomId('paper');
    const scissorsButton = new Discord.MessageButton().setLabel('Scissors').setStyle('SUCCESS').setCustomId('scissors');

    const choices = new Discord.MessageActionRow().addComponents(rockButton, paperButton, scissorsButton);

    interaction.reply({ content: 'You accepted the game', ephemeral: true });
    interaction.message.edit({ content: interaction.message.content + '\n\nThis request has expired', components: [join] });

    const filter = i => (i.user.id === requested || i.user.id === gameStarter.user.id);

    const msg = await interaction.channel.send({ embeds: [gameBoard], components: [choices] });
    const collector = msg.createMessageComponentCollector({ filter: filter, time: 60000 });

    const answers = [];
    let finalEmbed;


    collector.on('collect', async(_interaction) => {
        if (answers.some(answer => answer.ID === _interaction.user.id)) return client.util.throwError(_interaction, 'You already answered!');
        answers.push({ ID: _interaction.user.id, answer: _interaction.customId });
        await _interaction.reply({ content: `Your answer ${_interaction.customId} has been collected`, ephemeral: true });


        if (answers.length === 2) {

            const member1 = await client.util.getMember(interaction.guild, answers.find(answer => answer.ID === gameStarter.user.id).ID);
            const member2 = await client.util.getMember(interaction.guild, answers.find(answer => answer.ID === requested).ID);

            const member1Option = answers.find(answer => answer.ID === member1.id).answer;
            const member2Option = answers.find(answer => answer.ID === member2.id).answer;

            let beats;

            let winner;
            if (member1Option === 'rock' && member2Option === 'scissors') winner = member1, beats = '**rock** _crushes_ **scissors**';
            if (member1Option === 'rock' && member2Option === 'paper') winner = member2, beats = '**paper** _covers_ **rock**';
            if (member1Option === 'scissors' && member2Option === 'rock') winner = member2, beats = '**rock** _crushes_ **scissors**';
            if (member1Option === 'scissors' && member2Option === 'paper') winner = member1, beats = '**scissors** _cuts_ **paper**';
            if (member1Option === 'paper' && member2Option === 'rock') winner = member1, beats = '**paper** _covers_ **rock**';
            if (member1Option === 'paper' && member2Option === 'scissors') winner = member2, beats = '**scissors** _cuts_ **paper**';

            if (!winner) winner = 'tie', beats = `**${member1Option}** ties against **${member2Option}**`;

            collector.stop();
            finalEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`${member1} picked ${member1Option}, ${member2} picked ${member2Option}\n> ${beats}\n${winner === 'tie' ? 'It is a tie' : `The winner is ${winner}`}`)
            .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
            return msg.edit({ embeds: [finalEmbed], components: [] })
        }
    })

    collector.on('end', (_, reason) => {

        global.requestCooldown.delete(gameStarter.user.id)
        global.requestedCooldown.delete(requested)
        global.openedSession.delete(gameStarter.user.id);
        global.openedSession.delete(requested);

        if (reason === 'time') return msg.edit({ embeds: [
            new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription('Did not receive a response from both users within 60 seconds!')
            .setAuthor('Rock Paper Scissors', client.user.displayAvatarURL())
        ], components: [] })
        if (answers.length !== 2) return msg.edit({ embeds: [gameBoard], components: [choices_] })
    })
}