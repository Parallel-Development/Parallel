const fs = require('fs');

class CommandHandler {
    constructor(client) {
        const commandFolders = fs.readdirSync('./commands');
        commandFolders.forEach(folder => {
            const commandFiles = fs.readdirSync(`./commands/${folder}`);
            for (let i = 0; i !== commandFiles.filter(file => file.endsWith('.js')).length; ++i) {
                const file = commandFiles[i];
                const command = require(`../commands/${folder}/${file}`);
                client.commands.set(command.name, command);
                if (command.aliases) {
                    command.aliases.forEach(alias => client.aliases.set(alias, command.name));
                }
            }
        });
    }
}

module.exports = CommandHandler;
