const Discord = require('discord.js');
const Utils = require('./Utils');
const PunishmentManager = require('./PunishmentManager');
const Helpers = require('./Helpers');
const EventHandler = require('../handlers/EventHandler');
const CommandHandler = require('../handlers/CommandHandler');
const ExpiredHandler = require('../handlers/ExpiredHandler');
const ProcessEventsHandler = require('../handlers/ProcessEventsHandler');
const fs = require('fs');
const mongoose = require('mongoose');

class Client extends Discord.Client {
    constructor() {
        super({
            intents: [
                Discord.Intents.FLAGS.GUILDS,
                Discord.Intents.FLAGS.GUILD_MESSAGES,
                Discord.Intents.FLAGS.GUILD_MEMBERS,
                Discord.Intents.FLAGS.GUILD_BANS,
                Discord.Intents.FLAGS.GUILD_VOICE_STATES
            ],
            makeCache: Discord.Options.cacheWithLimits({
                ...Discord.Options.defaultMakeCacheSettings,
                GuildEmojiManager: 0,
                GuildInviteManager: 0,
                VoiceStateManager: 0,
                StageInstanceManager: 0,
                GuildStickerManager: 0,
                ThreadManager: 100,
                UserManager: {
                    maxSize: 2000,
                    sweepInterval: 1800000,
                    sweepFilter: user => user.id !== '745401642664460319'
                },
                GuildMemberManager: {
                    sweepInterval: 1800000,
                    sweepFilter: member => member.id !== '745401642664460319'
                }
            }),
            allowedMentions: {
                parse: ['users'],
                repliedUser: false
            }
        });

        this.util = new Utils();
        this.helpers = new Helpers();
        this.punishmentManager = new PunishmentManager();
        this.cache = {
            maliciousLinks: [],
            whitelistedUsers: [],
            whitelistedServers: [],
            hasAllSchemas: [],
            settings: new Map(),
            automod: new Map()
        };
        this.commands = new Discord.Collection();
        this.aliases = new Discord.Collection();
        this.events = new Discord.Collection();
        this.categories = fs.readdirSync('./commands');
        this.config = require('../config.json');

        global.collectionPrevention = [];
        global.confirmationRequests = [];
        global.requestCooldown = [];
        global.requestedCooldown = [];
        global.openedSession = new Set();
        global.lockdownCooldown = new Set();
        global.notMutedUsers = [];

        mongoose
            .connect(this.config.mongoURL, {
                keepAlive: true,
                useNewUrlParser: true,
                useUnifiedTopology: true
            })
            .then(() => {
                console.log('Successfully connected to database');

                // lean all query options by default
                const __setOptions = mongoose.Query.prototype.setOptions;
                mongoose.Query.prototype.setOptions = function (options) {
                    return __setOptions.apply(this, arguments).lean();
                };
            });

        new EventHandler(this), new CommandHandler(this), new ExpiredHandler(this), new ProcessEventsHandler();
    }
}

module.exports = Client;
