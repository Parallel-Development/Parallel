const fs = require('fs');

class EventHandler {
    constructor(client) {
        const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
        for (let i = 0; i !== eventFiles.length; ++i) {
            const event = require(`../events/${eventFiles[i]}`);
            if (event.once) client.once(event.name, (...args) => event.execute(client, ...args));
            else client.on(event.name, (...args) => event.execute(client, ...args));
        }
    }
}

module.exports = EventHandler;
