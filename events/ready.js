const Discord = require('discord.js');
const fs = require('fs');
const commandFolders = fs.readdirSync('./SlashCommands');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) { 
        client.user.setActivity('>help', { type: 'LISTENING'} )
        console.log(`Logged in as ${client.user.tag}!`);

        /*
        if (global.void === true) console.log('Bot is in void mode');

        const guild = client.guilds.cache.get('790760107365498880');
        const guild2 = client.guilds.cache.get('839553365213446144');
        const _guildCommands = await guild.commands.fetch();
        const _guildCommands2 = await guild2.commands.fetch();
        const guildCommands = [..._guildCommands.values()];
        const guildCommands2 = [..._guildCommands2.values()];

        client.slashCommands = new Discord.Collection();
        for(const folder of commandFolders) {
            const commandFiles = fs.readdirSync(`./SlashCommands/${folder}`);
            for(const file of commandFiles) {
                const command = require(`../SlashCommands/${folder}/${file}`);
                if(command.userPermissions) {
                    const permissions = command.userPermissions;
                    const guildCommand = guildCommands.find(cmd => cmd.name === command.name);
                    const guildCommand2 = guildCommands2.find(cmd => cmd.name === command.name);
                    await guildCommand.permissions.set({ permissions })
                    await guildCommand2.permissions.set({ permissions })
                }

                client.slashCommands.set(command.data.name, command);
            }
        }

        console.log('All commands have been loaded!');
        console.log(`Completed in: ${Math.floor(process.uptime())} seconds`)

        */

        return;
    }
}