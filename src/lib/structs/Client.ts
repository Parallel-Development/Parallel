import { Client as DJSClient, IntentsBitField as Intents, Options, Sweepers } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { createPrismaRedisCache } from 'prisma-redis-middleware';
import fs from 'fs';
import type Command from './Command';
import * as util from '../util/functions';
import type Listener from './Listener';
import type Modal from './Modal';

class Client extends DJSClient {
  public db = new PrismaClient();
  public commands: Map<string, Command> = new Map();
  public modals: Map<string, Modal> = new Map();
  public util = util;

  constructor() {
    super({
      intents: [Intents.Flags.Guilds, Intents.Flags.GuildMembers, Intents.Flags.GuildMessages],
      makeCache: Options.cacheEverything(),
      sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: {
          interval: 180,
          lifetime: 900
        },
        guildMembers: {
          interval: 300,
          filter: Sweepers.filterByLifetime({
            lifetime: 900,
            excludeFromSweep: member => member.id !== process.env.CLIENT_ID
          })
        }
      },
      shardCount: 1,
      allowedMentions: {
        parse: []
      }
    })
  }

  async _cacheModals() {
    const files = fs.readdirSync('src/modals');
    for (const file of files) {
      const modalClass = (await import(`../../modals/${file.slice(0, -3)}`)).default;
      const modalInstant: Modal = new modalClass();
      this.modals.set(modalInstant.name, modalInstant);
    }
  }

  async _cacheCommands() {
    const files = fs.readdirSync('src/commands');
    for (const file of files) {
      const cmdClass = (await import(`../../commands/${file.slice(0, -3)}`)).default;
      const cmdInsant: Command = new cmdClass();
      this.commands.set(cmdInsant.data.name!, cmdInsant);
    }
  }

  async _loadListeners() {
    const files = fs.readdirSync('src/listeners');
    for (const file of files) {
      const listenerClass = (await import(`../../listeners/${file.slice(0, -3)}`)).default;
      const listenerInstant: Listener = new listenerClass();
      listenerInstant.once 
      ? this.once(listenerInstant.name, (...args) => void listenerInstant.run(...args))
      : this.on(listenerInstant.name, (...args) => void listenerInstant.run(...args));
    }
  }

  override async login(token: string) {
    await this._cacheCommands();
    await this._cacheModals();
    await this._loadListeners();

    this.db.$use(createPrismaRedisCache({
      storage: {
        type: 'memory',
        options: {
          invalidation: true
        }
      },
      cacheTime: 600000
    })); 
    await this.db.$connect(); 

    return super.login(token);
  }
}

export default Client;