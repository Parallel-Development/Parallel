if (process.argv.slice(2).includes('--v') || process.argv.slice(2).includes('--void')) {
    global.void = true;
}
if (process.argv.slice(2).includes('--parallele') || process.argv.slice(2).includes('--p')) {
    global.parallele = true;
}

const Client = require('./structures/Client');
const client = new Client();

client.login(global.parallele ? client.config.paralleleToken : client.config.token);