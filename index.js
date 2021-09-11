if (process.argv.slice(2).includes('--v') || process.argv.slice(2).includes('--void')) {
    global.void = true;
}

const Discord = require('discord.js');
const client = new Discord.Client({ intents: [
    Discord.Intents.FLAGS.GUILDS, 
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MEMBERS, 
    Discord.Intents.FLAGS.DIRECT_MESSAGES, 
    Discord.Intents.FLAGS.GUILD_BANS,
    Discord.Intents.FLAGS.GUILD_VOICE_STATES
], allowedMentions: { parse: [ 'users' ], repliedUser: false  } });

const fs = require('fs');
const Utils = require('./structures/Utils');
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.util = new Utils();
client.events = new Discord.Collection();
client.categories = fs.readdirSync('./commands');
client.config = require('./config.json');
global.collectionPrevention = [];
global.guildCollectionPrevention = [];

const mongo = require('./mongo');
const connectToMongoDB = async () => {
    await mongo().then(async() => {
        process.stdout.write('Connected to mongoDB!\n');
    })
}
connectToMongoDB();
const EventHandler = require('./handlers/EventHandler'), CommandHandler = require('./handlers/CommandHandler'), ExpiredHandler = require('./handlers/ExpiredHandler');
new EventHandler(client), new CommandHandler(client), new ExpiredHandler(client);

process.on('uncaughtException', (error) => {
    console.error(error);
})

client.login(client.config.token);
