const Discord = require('discord.js');
const { Aki } = require('aki-api');

module.exports = {
    name: 'akinator',
    description: 'Choose a character, animal, or object, and have the bot — using the akinator API — guess it with a max of 50 yes and no questions',
    usage: 'akinator [characters, animals, objects]',
    aliases: ['aki'],
    async execute(client, message, args) {

        if (global.collectionPrevention.some(prevention => prevention.guildID === message.guild.id && prevention.memberID === message.author.id)) return client.util.throwError(message, 'cannot create an akinator game while a collector is already still going')

        let region = `en_${args[0]?.toLowerCase()}`;
        if (region === 'en_characters') region = 'en';

        const gameBoards = [];
        let whatType;

        if (!['en', 'en_animals', 'en_objects'].includes(region)) {
            const characterBtn = new Discord.MessageButton().setLabel('Characters').setStyle('PRIMARY').setCustomId('characters');
            const animalBtn = new Discord.MessageButton().setLabel('Animals').setStyle('PRIMARY').setCustomId('animals');
            const objectBtn = new Discord.MessageButton().setLabel('Objects').setStyle('PRIMARY').setCustomId('objects');
            const nevermindBtn = new Discord.MessageButton().setLabel('Never mind').setStyle('DANGER').setCustomId('nevermind');
            const row = new Discord.MessageActionRow().addComponents(characterBtn, animalBtn, objectBtn, nevermindBtn);

            whatType = await message.reply({ content: `What will I be guessing?`, components: [row] });
            const collector = await whatType.createMessageComponentCollector({ time: 30000 });

            collector.on('collect', async interaction => {

                if (interaction.user.id !== message.author.id) return client.util.throwError(interaction, client.config.errors.no_button_access)

                switch (interaction.customId) {
                    case 'characters': region = 'en'; break;
                    case 'animals': region = 'en_animals'; break;
                    case 'objects': region = 'en_objects'; break;
                    case 'nevermind': 
                        client.util.removeMemberFromCollectionPrevention(message.guild.id, message.author.id);
                        return interaction.update({ content: 'Game cancelled.', components: [] })
                    default: return message.reply('Something went horribly wrong...');
                }

                await collector.stop();
                await interaction.update({ content: `Creating a new game, please wait... ${client.config.emotes.loading}`, components: [] })
                gameBoards.push({ userID: message.author.id, message: interaction.message });
                const aki = new Aki({ region });
                await aki.start();
                ready(aki);
            })

            collector.on('end', (col, reason) => {
                if (reason === 'time') return whatType.edit({ content: '30 second response limit exceeded', components: [] });
            })
        } else {
            const msg = await message.channel.send(`Creating a new game, please wait... ${client.config.emotes.loading}`);
            gameBoards.push({ userID: message.author.id, message: msg });
            const aki = new Aki({ region });
            await aki.start();
            ready(aki);
        }

        client.util.addMemberToCollectionPrevention(message.guild.id, message.author.id);

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

            let gameMessageBoard = gameBoards.find(board => board.userID === message.author.id).message;

            await gameMessageBoard.edit({ content: aki.question, components: [row, row2] });
            const collector = await gameMessageBoard.createMessageComponentCollector({ time: 300000 });

            let latestAnswer;


            collector.on('collect', async interaction => {

                if (interaction.user.id !== message.author.id) return client.util.throwError(interaction, client.config.errors.no_button_access)

                if ((interaction.customId === 'yes' || interaction.customId === 'no') && gameMessageBoard.embeds.length) {
                    if (interaction.customId === 'yes') {
                        await aki.win();
                        await collector.stop();
                        return interaction.update({ components: [] });
                    } else {
                        if (global.collectionPrevention.some(prevention => prevention.guildID === message.guild.id && prevention.memberID === message.author.id)) return interaction.update({ content: 'Cannot continue the game as a new game is already ongoing', components: [] });
                        client.util.addMemberToCollectionPrevention(message.guild.id, message.author.id);
                        while (aki.answers[0].name === latestAnswer) await aki.step(1);
                    }
                }

                if (interaction.customId === 'end') {
                    await aki.win();
                    await interaction.update({ content: `Game cancelled.${aki.progress >= 50 ? `I was **${aki.progress}%** sure the answer was \`${aki.answers[0].name}\`` : ''}`, components: [] })
                    return collector.stop();
                }

                interaction.update({ content: `${interaction.message.content} ${client.config.emotes.loading}` });

                await aki.step(answers[interaction.customId]);
                if (aki.progress >= 80) {

                    await aki.win();

                    const guessEmbed = new Discord.MessageEmbed()
                        .setAuthor('Akinator', client.user.displayAvatarURL())
                        .setDescription(`I am **${aki.progress}%** sure you were thinking of...\n> ${aki.answers[0].name}`)
                        .setColor(client.util.mainColor(message.guild))
                        if (region !== 'en_objects') guessEmbed.setThumbnail(aki.answers[0].absolute_picture_path.replaceAll('\\', '') )

                    client.util.removeMemberFromCollectionPrevention(message.guild.id, message.author.id);
                    latestAnswer = aki.answers[0].name;
                    return gameMessageBoard.edit({ content: null, embeds: [guessEmbed], components: [new Discord.MessageActionRow().addComponents(yes, no)]})
                }

                if (collector.collected.size === 50) {
                    await collector.stop();
                    return interaction.message.edit({ content: 'I could not guess your character in 50 questions', components: [] })
                }

                await gameMessageBoard.edit({ embeds: [], content: `${aki.question} | Guess Count: ${collector.collected.size}`, components: [row, row2] });
            })

            collector.on('end', (col, reason) => {
                client.util.removeMemberFromCollectionPrevention(message.guild.id, message.author.id);
                gameMessageBoard = message.channel.messages.cache.get(gameMessageBoard.id);
                if (reason === 'time' && !gameMessageBoard.content.startsWith('I am')) gameMessageBoard.edit({ content: '5 minute time limit exceeded', components: [] });
            })

        }
    }
}
