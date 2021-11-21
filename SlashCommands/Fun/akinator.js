const Discord = require('discord.js');
const { Aki } = require('aki-api');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'akinator',
    description: 'Choose a character, animal, or object, and have the bot — using the akinator API — guess it with a max of 30 yes and no questions',
    usage: 'akinator [characters, animals, objects]',
    aliases: ['aki'],
    data: new SlashCommandBuilder()
        .setName('akinator')
        .setDescription('Have Parallel — using the akinator API — guess your element in 30 guesses')
        .addStringOption(option => option.setName('type').setDescription('The type of element to guess for')
            .addChoice('characters', 'en')
            .addChoice('animals', 'en_animals')
            .addChoice('objects', 'en_objects')
        ),
    async execute(client, interaction, args) {

        if (global.collectionPrevention.some(prevention => prevention.guildID === interaction.guild.id && prevention.memberID === interaction.user.id)) return client.util.throwError(interaction, 'cannot create an akinator game while a collector is already still going')

        let region = args['type'];

        if (!['en', 'en_animals', 'en_objects'].includes(region)) {
            const characterBtn = new Discord.MessageButton().setLabel('Characters').setStyle('PRIMARY').setCustomId('characters');
            const animalBtn = new Discord.MessageButton().setLabel('Animals').setStyle('PRIMARY').setCustomId('animals');
            const objectBtn = new Discord.MessageButton().setLabel('Objects').setStyle('PRIMARY').setCustomId('objects');
            const row = new Discord.MessageActionRow().addComponents(characterBtn, animalBtn, objectBtn);

            await interaction.reply({ content: `What will I be guessing?`, components: [row] });
            const filter = i => i.user.id === interaction.user.id;
            const interactionMessage = interaction.channel.messages.cache.find(m => m.interaction?.id === interaction.id);
            const collector = await interactionMessage.createMessageComponentCollector({ filter, max: 1 });

            collector.on('collect', async interaction => {
                switch (interaction.customId) {
                    case 'characters': region = 'en'; break;
                    case 'animals': region = 'en_animals'; break;
                    case 'objects': region = 'en_objects'; break;
                    default: return interaction.reply('Something went horribly wrong...');
                }

                await interaction.update({ content: `Creating a new game, please wait...`, components: [] })
                gameMessageBoard = interactionMessage;
                const aki = new Aki({ region });
                await aki.start();
                ready(aki);
            })
        } else {
            await interaction.reply(`Creating a new game, please wait...`);
            gameMessageBoard = interaction.channel.messages.cache.find(m => m.interaction?.id === interaction.id);
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

            const filter = i => i.user.id === interaction.user.id;
            await gameMessageBoard.edit({ content: aki.question, components: [row, row2] });
            const collector = await gameMessageBoard.createMessageComponentCollector({ filter, max: 30 });

            collector.on('collect', async interaction => {

                if (Date.now() - lastCreatedTimestamp >= 180000) {
                    await aki.win();
                    await collector.stop();
                    await interaction.update({ components: [] });
                    return interaction.reply({ content: 'Game ended due to inactivity', ephemeral: true });
                }

                if ((interaction.customId === 'yes' || interaction.customId === 'no') && gameMessageBoard.content.startsWith('I am')) {
                    if (interaction.customId === 'yes') {
                        await aki.win();
                        await collector.stop();
                        return interaction.update({ components: [] });
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
                    return interaction.update({ content: `I am **${aki.progress}%** sure the answer is: \`${aki.answers[0].name}\``, components: [new Discord.MessageActionRow().addComponents(yes, no)] })
                }

                if (collector.collected.size === 30) return interaction.update({ content: 'I could not guess your character in 30 questions', components: [] })

                await interaction.update({ content: `${aki.question} | Guess Count: ${collector.collected.size}`, components: [row, row2] }).catch(() => {} );
            })

            collector.on('end', (col, reason) => {
                client.util.removeMemberFromCollectionPrevention(interaction.guild.id, interaction.user.id);
                if (reason === 'time') gameMessageBoard.edit({ content: '3 minute time limit exceeded', components: [] });
            })

        }
    }
}