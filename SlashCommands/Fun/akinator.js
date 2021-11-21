const Discord = require('discord.js');
const { Aki } = require('aki-api');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'akinator',
    description: 'Choose a character, animal, or object, and have the bot — using the akinator API — guess it with a max of 50 yes and no questions',
    usage: 'akinator [characters, animals, objects]',
    aliases: ['aki'],
    data: new SlashCommandBuilder()
        .setName('akinator')
        .setDescription('Have Parallel — using the akinator API — guess your element in 50 guesses')
        .addStringOption(option => option.setName('type').setDescription('The type of element to guess for')
            .addChoice('characters', 'en')
            .addChoice('animals', 'en_animals')
            .addChoice('objects', 'en_objects')
        ),
    async execute(client, interaction, args) {

        if (global.collectionPrevention.some(prevention => prevention.guildID === interaction.guild.id && prevention.memberID === interaction.user.id)) return client.util.throwError(interaction, 'cannot create an akinator game while a collector is already still going');

        const collectorOwner = interaction.user.id

        let region = args['type'];

        const gameBoards = [];

        if (!['en', 'en_animals', 'en_objects'].includes(region)) {
            const characterBtn = new Discord.MessageButton().setLabel('Characters').setStyle('PRIMARY').setCustomId('characters');
            const animalBtn = new Discord.MessageButton().setLabel('Animals').setStyle('PRIMARY').setCustomId('animals');
            const objectBtn = new Discord.MessageButton().setLabel('Objects').setStyle('PRIMARY').setCustomId('objects');
            const nevermindBtn = new Discord.MessageButton().setLabel('Never mind').setStyle('DANGER').setCustomId('nevermind');
            const row = new Discord.MessageActionRow().addComponents(characterBtn, animalBtn, objectBtn, nevermindBtn);

            await interaction.reply({ content: `What will I be guessing?`, components: [row] });
            const interactionMessage = interaction.channel.messages.cache.find(m => m.interaction?.id === interaction.id);
            const collector = await interactionMessage.createMessageComponentCollector();

            collector.on('collect', async interaction => {

                if (interaction.user.id !== collectorOwner) return client.util.throwError(interaction, client.config.errors.no_button_access)

                switch (interaction.customId) {
                    case 'characters': region = 'en'; break;
                    case 'animals': region = 'en_animals'; break;
                    case 'objects': region = 'en_objects'; break;
                    case 'nevermind':
                        client.util.removeMemberFromCollectionPrevention(message.guild.id, message.author.id);
                        return interaction.update({ content: 'Game cancelled.', components: [] })
                    default: return interaction.reply('Something went horribly wrong...');
                }

                await collector.stop();
                await interaction.update({ content: `Creating a new game, please wait...`, components: [] })
                gameBoards.push({ userID: interaction.user.id, message: interaction.message });
                const aki = new Aki({ region });
                await aki.start();
                ready(aki);
            })

            collector.on('end', (col, reason) => {
                if (reason === 'time') return interaction.editReply({ content: '30 second response limit exceeded', components: [] });
            })
        } else {
            await interaction.reply(`Creating a new game, please wait...`);
            gameBoards.push({ userID: interaction.id, message: interaction.channel.messages.cache.find(m => m.interaction?.id === interaction.id) });
            const aki = new Aki({ region });
            await aki.start();
            ready(aki);
        }

        client.util.addMemberToCollectionPrevention(interaction.guild.id, interaction.user.id);

        async function ready(aki) {

            const yes = new Discord.MessageButton().setLabel('Yes').setStyle('SUCCESS').setCustomId('yes');
            const no = new Discord.MessageButton().setLabel('No').setStyle('DANGER').setCustomId('no');
            const idk = new Discord.MessageButton().setLabel('I don\'t know').setStyle('PRIMARY').setCustomId('idk');
            const probably = new Discord.MessageButton().setLabel('Probably').setStyle('PRIMARY').setCustomId('probably');
            const probablyNot = new Discord.MessageButton().setLabel('Probably not').setStyle('PRIMARY').setCustomId('probablyNot');
            const end = new Discord.MessageButton().setLabel('End Game').setStyle('DANGER').setCustomId('end');

            const row = new Discord.MessageActionRow().addComponents(yes, no, idk, probably, probablyNot);
            const row2 = new Discord.MessageActionRow().addComponents(end);

            const answers = {
                yes: 0,
                no: 1,
                idk: 2,
                probably: 3,
                probablyNot: 4
            };

            let gameMessageBoard = gameBoards.find(board => board.userID === interaction.user.id).message;

            await gameMessageBoard.edit({ content: aki.question, components: [row, row2] });
            const collector = await gameMessageBoard.createMessageComponentCollector({ time: 300000 });

            let latestAnswer;

            collector.on('collect', async interaction => {

                if (interaction.user.id !== collectorOwner) return client.util.throwError(interaction, client.config.errors.no_button_access)

                if ((interaction.customId === 'yes' || interaction.customId === 'no') && gameMessageBoard.embeds.length) {
                    if (interaction.customId === 'yes') {
                        await aki.win();
                        await collector.stop();
                        return interaction.update({ components: [] });
                    } else {
                        if (global.collectionPrevention.some(prevention => prevention.guildID === interaction.guild.id && prevention.memberID === interaction.user.id)) return interaction.update({ content: 'Cannot continue the game as a new game is already ongoing', components: [] });
                        client.util.addMemberToCollectionPrevention(interaction.guild.id, interaction.user.id);
                        while (aki.answers[0].name === latestAnswer) await aki.step(1);
                    }
                }

                if (interaction.customId === 'end') {
                    await aki.win();
                    await interaction.update({ content: `Game cancelled.${aki.progress >= 50 ? `I was **${aki.progress}%** sure the answer was \`${aki.answers[0].name}\`` : ''}`, components: [] })
                    return collector.stop();
                }

                interaction.update({ content: `${interaction.message.content} ...` });

                await aki.step(answers[interaction.customId]);
                if (aki.progress >= 80) {

                    await aki.win();

                    const guessEmbed = new Discord.MessageEmbed()
                        .setAuthor('Akinator', client.user.displayAvatarURL())
                        .setDescription(`I am **${aki.progress}%** sure you were thinking of...\n> ${aki.answers[0].name}`)
                        .setColor(client.util.mainColor(interaction.guild))
                        if (region !== 'en_objects') guessEmbed.setThumbnail(aki.answers[0].absolute_picture_path.replaceAll('\\', ''))

                    client.util.removeMemberFromCollectionPrevention(interaction.guild.id, interaction.user.id);
                    latestAnswer = aki.answers[0].name;
                    return gameMessageBoard.edit({ content: null, embeds: [guessEmbed], components: [new Discord.MessageActionRow().addComponents(yes, no)] })
                }

                if (collector.collected.size === 50) {
                    await collector.stop();
                    return interaction.message.edit({ content: 'I could not guess your character in 50 questions', components: [] })
                }

                await gameMessageBoard.edit({ embeds: [], content: `${aki.question} | Guess Count: ${collector.collected.size}`, components: [row, row2] });
            })

            collector.on('end', (col, reason) => {
                client.util.removeMemberFromCollectionPrevention(interaction.guild.id, interaction.user.id);
                gameMessageBoard = interaction.channel.messages.cache.get(gameMessageBoard.id);
                if (reason === 'time' && !gameMessageBoard.content.startsWith('I am')) gameMessageBoard.edit({ content: '5 minute time limit exceeded', components: [] });

                return gameBoards.pop({ userID: interaction.user.id });
            })

        }
    }
}