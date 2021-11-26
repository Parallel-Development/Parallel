const Discord = require('discord.js');
const Utils = require('./Utils');
const Helpers = require('./Helpers');
const EventHandler = require('../handlers/EventHandler');
const CommandHandler = require('../handlers/CommandHandler');
const ExpiredHandler = require('../handlers/ExpiredHandler');
const ProcessEventsHandler = require('../handlers/ProcessEventsHandler');
const fs = require('fs');

class Client {
    constructor() {
        this.client = new Discord.Client({
            intents: [
                Discord.Intents.FLAGS.GUILDS,
                Discord.Intents.FLAGS.GUILD_MESSAGES,
                Discord.Intents.FLAGS.GUILD_MEMBERS,
                Discord.Intents.FLAGS.DIRECT_MESSAGES,
                Discord.Intents.FLAGS.GUILD_BANS,
                Discord.Intents.FLAGS.GUILD_VOICE_STATES
            ],
            allowedMentions: {
                parse: ['users'],
                repliedUser: false
            }
        });

        this.client.util = new Utils();
        this.client.helpers = new Helpers();
        this.client.cache = {
            maliciousLinks: [],
            whitelistedUsers: [],
            whitelistedServers: [],
            hasAllSchemas: [],
            settings: new Map(),
            automod: new Map()
        };
        this.client.commands = new Discord.Collection();
        this.client.aliases = new Discord.Collection();
        this.client.events = new Discord.Collection();
        this.client.categories = fs.readdirSync('./commands');
        this.client.config = require('../config.json');

        global.collectionPrevention = [];
        global.confirmationRequests = [];
        global.requestCooldown = new Set();
        global.requestedCooldown = new Set();
        global.openedSession = new Set();
        global.lockdownCooldown = new Set();
        global.notMutedUsers = [];

        const mongo = require('../mongo');
        const connectToMongoDB = async () => {
            await mongo().then(() => {
                console.log('Connected to mongoDB!');
            });
        };

        connectToMongoDB();

        new EventHandler(this.client);
        new CommandHandler(this.client);
        new ExpiredHandler(this.client);
        new ProcessEventsHandler();
    }
}

module.exports = Client;
