const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { perpendicularToken } = require('./config.json');
const fs = require('fs');

const commands = [];
const commandFolders = fs.readdirSync('./SlashCommands');

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./SlashCommands/${folder}`);
    for (const file of commandFiles) {
        const command = require(`./SlashCommands/${folder}/${file}`);
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '9' }).setToken(perpendicularToken);

(async () => {
    try {
        console.log('Started refreshing application (/) commands with perpendicular.');

        await rest.put(Routes.applicationGuildCommands('833792285120528394', '790760107365498880'), { body: commands });

        console.log('Done!');
    } catch (error) {
        console.error(error);
    }
})();
