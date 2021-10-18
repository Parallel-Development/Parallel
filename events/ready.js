const Discord = require('discord.js');
const fs = require('fs');
const commandFolders = fs.readdirSync('./SlashCommands');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        client.user.setActivity('>help', { type: 'LISTENING' });
        process.stdout.write(`Logged in as ${client.user.tag}!\n`);

        if (global.void === true) process.stdout.write('Bot is in void mode\n');

        await client.application.commands.fetch();

        client.slashCommands = new Discord.Collection();
        for (const folder of commandFolders) {
            const commandFiles = fs.readdirSync(`./SlashCommands/${folder}`);
            for (const file of commandFiles) {
                const command = require(`../SlashCommands/${folder}/${file}`);
                client.slashCommands.set(command.data.name, command);
            }
        }

        process.stdout.write('All commands have been loaded!\n');
        process.stdout.write(`Completed in: ${Math.floor(process.uptime())} seconds\n`);

        return;
    }
};
