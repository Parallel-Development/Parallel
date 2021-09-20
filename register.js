const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { token } = require('./config.json');
const fs = require('fs');

const commands = [];
const commandFolders = fs.readdirSync('./SlashCommands')

for(const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./SlashCommands/${folder}`)
    for (const file of commandFiles) { 
	    const command = require(`./SlashCommands/${folder}/${file}`);
	    commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(
			Routes.applicationGuildCommands('745401642664460319', '790760107365498880'),
			{ body: commands },
		);

		console.log('Successfully reloaded application (/) commands.');

		await rest.put(
			Routes.applicationGuildCommands('745401642664460319', '839553365213446144'),
			{ body: commands },
		);

		console.log('Successfully reloaded application (/) commands to irrelevant server.');
	} catch (error) {
		console.error(error);
	}
})();