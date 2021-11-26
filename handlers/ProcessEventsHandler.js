const fs = require('fs');

class ProcessEventsHandler {
    constructor() {
        const eventFiles = fs.readdirSync('./ProcessEvents').filter(file => file.endsWith('.js'));
        for (let i = 0; i !== eventFiles.length; ++i) {
            const event = require(`../ProcessEvents/${eventFiles[i]}`);
            process.on(event.name, (...args) => event.execute(client, ...args));
        }
    }
}

module.exports = ProcessEventsHandler;