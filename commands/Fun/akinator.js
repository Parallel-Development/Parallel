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

        let gameMessageBoard;

        if (!['en', 'en_animals', 'en_objects'].includes(region)) {
            const characterBtn = new Discord.MessageButton().setLabel('Characters').setStyle('PRIMARY').setCustomId('characters');
            const animalBtn = new Discord.MessageButton().setLabel('Animals').setStyle('PRIMARY').setCustomId('animals');
            const objectBtn = new Discord.MessageButton().setLabel('Objects').setStyle('PRIMARY').setCustomId('objects');
            const nevermindBtn = new Discord.MessageButton().setLabel('Nevermind').setStyle('DANGER').setCustomId('nevermind');
            const row = new Discord.MessageActionRow().addComponents(characterBtn, animalBtn, objectBtn, nevermindBtn);

            const whatType = await message.reply({ content: `What will I be guessing?`, components: [row] });
            const filter = i => i.user.id === message.author.id;
            const collector = await whatType.createMessageComponentCollector({ filter, max: 1 });

            collector.on('collect', async interaction => {
                switch (interaction.customId) {
                    case 'characters': region = 'en'; break;
                    case 'animals': region = 'en_animals'; break;
                    case 'objects': region = 'en_objects'; break;
                    case 'nevermind': 
                        client.util.removeMemberFromCollectionPrevention(message.guild.id, message.author.id);
                        return interaction.update({ content: 'Game cancelled.', components: [] })
                    default: return message.reply('Something went horribly wrong...');
                }

                await interaction.update({ content: `Creating a new game, please wait... ${client.config.emotes.loading}`, components: [] })
                gameMessageBoard = interaction.message;
                const aki = new Aki({ region });
                await aki.start();
                ready(aki);
            })
        } else {
            gameMessageBoard = await message.channel.send(`Creating a new game, please wait... ${client.config.emotes.loading}`);
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

            const filter = i => i.user.id === message.author.id;
            await gameMessageBoard.edit({ content: aki.question, components: [row, row2] });
            const collector = await gameMessageBoard.createMessageComponentCollector({ filter, max: 50, time: 180000 });


            collector.on('collect', async interaction => {

                if ((interaction.customId === 'yes' || interaction.customId === 'no') && gameMessageBoard.content.startsWith('I am')) {
                    if (interaction.customId === 'yes') {
                        await aki.win();
                        await collector.stop();
                        return interaction.update({ components: [] });
                    } else {
                        if (global.collectionPrevention.some(prevention => prevention.guildID === message.guild.id && prevention.memberID === message.author.id)) return interaction.update({ content: 'Cannot continue the game as a new game is already ongoing', components: [] });
                        client.util.addMemberToCollectionPrevention(message.guild.id, message.author.id);
                        while (aki.progress >= 80) await aki.step(1);
                    }
                }

                if (interaction.customId === 'end') {
                    await aki.win();
                    await interaction.update({ content: `Game cancelled.${aki.progress >= 50 ? `I was **${aki.progress}%** sure the answer was \`${aki.answers[0].name}\`` : ''}`, components: [] })
                    return collector.stop();
                }

                await aki.step(answers[interaction.customId]);
                if (aki.progress >= 80) {
                    await aki.win();
                    client.util.removeMemberFromCollectionPrevention(message.guild.id, message.author.id);
                    return interaction.update({ content: `I am **${aki.progress}%** sure the answer is: \`${aki.answers[0].name}\``, components: [new Discord.MessageActionRow().addComponents(yes, no)]})
                }

                if (collector.collected.size === 50) return interaction.message.edit({ content: 'I could not guess your character in 50 questions', components: [] })

                await interaction.update({ content: `${aki.question} | Guess Count: ${collector.collected.size}`, components: [row, row2] });
            })

            collector.on('end', (col, reason) => {
                client.util.removeMemberFromCollectionPrevention(message.guild.id, message.author.id);
                if (reason === 'time') gameMessageBoard.edit({ content: '3 minute time limit exceeded', components: [] });
            })

        }
    }
}