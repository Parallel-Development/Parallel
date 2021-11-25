if (process.argv.slice(2).includes('--v') || process.argv.slice(2).includes('--void')) {
    global.void = true;
}
if (process.argv.slice(2).includes('--perpendicular') || process.argv.slice(2).includes('--p')) {
    global.perpendicular = true;
}

const Discord = require('discord.js');
const client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MEMBERS,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
        Discord.Intents.FLAGS.GUILD_BANS,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES
    ],
    allowedMentions: { parse: ['users'], repliedUser: false }
});

const fs = require('fs');
const Utils = require('./structures/Utils');
const Helpers = require('./structures/Helpers');

console.errorLogs = [];

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.util = new Utils();
client.cache = {
    maliciousLinks: [],
    whitelistedUsers: [],
    whitelistedServers: [],
    hasAllSchemas: [],
    settings: new Map(),
    automod: new Map()
};
global.notMutedUsers = [];
client.helpers = new Helpers();
client.events = new Discord.Collection();

client.categories = fs.readdirSync('./commands');
client.config = require('./config.json');

global.collectionPrevention = [];
global.confirmationRequests = [];
global.requestCooldown = new Set();
global.requestedCooldown = new Set();
global.openedSession = new Set();
global.lockdownCooldown = new Set();

const mongo = require('./mongo');
const connectToMongoDB = async () => {
    await mongo().then(() => {
        console.log('Connected to mongoDB!');
    });
};
connectToMongoDB();
const EventHandler = require('./handlers/EventHandler'),
    CommandHandler = require('./handlers/CommandHandler'),
    ExpiredHandler = require('./handlers/ExpiredHandler');
new EventHandler(client), new CommandHandler(client), new ExpiredHandler(client);

process.on('uncaughtException', error => {
    console.error(error);
    if (!console.errorLogs.includes(error.stack)) console.errorLogs.push(error.stack);
});

client.login(global.perpendicular ? client.config.perpendicularToken : client.config.token);
