require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { CLIENT_ID, DEV_GUILD_ID, TOKEN } = process.env;
const fs = require('node:fs');

const commands = [];
// Grab all the command files from the commands directory you created earlier
const commandFiles = fs.readdirSync('dist/commands').filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const commandClass = require(`./dist/commands/${file}`).default;
  const commandInstant = new commandClass();
  commands.push(commandInstant.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(TOKEN);

// and deploy your commands!
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, DEV_GUILD_ID), { body: commands });
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, '980593281257852999'), { body: commands });

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
