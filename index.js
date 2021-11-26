if (process.argv.slice(2).includes('--v') || process.argv.slice(2).includes('--void')) {
    global.void = true;
}
if (process.argv.slice(2).includes('--perpendicular') || process.argv.slice(2).includes('--p')) {
    global.perpendicular = true;
}

const Client = require('./structures/Client');
const client = new Client().client;
client.login(global.perpendicular ? client.config.perpendicularToken : client.config.token);
