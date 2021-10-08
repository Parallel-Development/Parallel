const Discord = require('discord.js');
const fs = require('fs');
const commandFolders = fs.readdirSync('./SlashCommands');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) { 
        client.user.setActivity('>help', { type: 'LISTENING'} )
        console.log(`Logged in as ${client.user.tag}!`);
        
        if (global.void === true) console.log('Bot is in void mode');

        const _clientCommands = await client.commands.fetch();
        const clientCommands = [..._clientCommands.values()];

        client.slashCommands = new Discord.Collection();
        for(const folder of commandFolders) {
            const commandFiles = fs.readdirSync(`./SlashCommands/${folder}`);
            for(const file of commandFiles) {
                const command = require(`../SlashCommands/${folder}/${file}`);
                if (command.userPermissions) {
                    const permissions = command.userPermissions;
                    await clientCommands.permissions.set({ permissions })
                }

                client.slashCommands.set(command.data.name, command);
            }
        }

        console.log('All commands have been loaded!');
        console.log(`Completed in: ${Math.floor(process.uptime())} seconds`)

        return;
    }
}