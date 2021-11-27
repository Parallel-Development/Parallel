const fs = require('fs');

class ProcessEventsHandler {
    constructor(client) {
        const eventFiles = fs.readdirSync('./ProcessEvents').filter(file => file.endsWith('.js'));
        for (let i = 0; i !== eventFiles.length; ++i) {
            const event = require(`../ProcessEvents/${eventFiles[i]}`);
            process.on(event.name, (...args) => event.execute(...args));
        }
    }
}

module.exports = ProcessEventsHandler;
