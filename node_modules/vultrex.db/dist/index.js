"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const load = (options) => {
    const providers = {
        sqlite: './providers/SQLiteProvider',
        mongodb: './providers/MongoDBProvider'
    };
    if (typeof options.provider !== 'undefined') {
        return providers[options.provider];
    }
};
class VultrexDB {
    constructor(options) {
        const Provider = require(load(options)).default;
        this.provider = new Provider(options);
    }
    /**
     * Connect to SQLite or MongoDB
     *
     * @example
     * const { VultrexDB } = require("vultrex.db");
     * const db = new VultrexDB({
     *     provider: "sqlite"
     * });
     * await db.connect();
     *
     * @example
     * const { VultrexDB } = require("vultrex.db");
     * const db = new VultrexDB({
     * 		provider: "mongodb",
     *      url: "connectionString"
     * });
     * await db.connect();
    */
    async connect() {
        return this.provider.init();
    }
    /**
     * Get a value from the database with the specified key and optionally fallback to a default value
     *
     * @param key
     * @param defaultValue
     *
     * @example
     * const { VultrexDB } = require("vultrex.db");
     * const db = new VultrexDB({
     * 		provider: new SQLiteProvider({ name: "main" })
     * });
     * await db.connect();
     * const value = await db.get("key", "defaultValue");
    */
    async get(key, defaultValue) {
        this.checkReady();
        return this.provider.get(key, defaultValue);
    }
    /**
     * Return an array of all values from the database
     *
     * @param key
     *
     * @example
     * const { VultrexDB } = require("vultrex.db");
     * const db = new VultrexDB({
     * 		provider: new SQLiteProvider({ name: "main" })
     * });
     * await db.connect();
     * const values = await db.getAll();
    */
    async getAll(key) {
        this.checkReady();
        return this.provider.getAll(key);
    }
    /**
     * Set a value of a key in the database
     *
     * @param key
     * @param value
     *
     * @example
     * const { VultrexDB } = require("vultrex.db");
     * const db = new VultrexDB({
     * 		provider: new SQLiteProvider({ name: "main" })
     * });
     * await db.connect();
     * await db.set("key", "newValue");
    */
    async set(key, value) {
        this.checkReady();
        return this.provider.set(key, value);
    }
    /**
     * Delete a key from the database
     *
     * @param key
     *
     * @example
     * const { VultrexDB } = require("vultrex.db");
     * const db = new VultrexDB({
     * 		provider: new SQLiteProvider({ name: "main" })
     * });
     * await db.connect();
     * await db.delete("key");
    */
    async delete(key) {
        this.checkReady();
        return this.provider.delete(key);
    }
    /**
     * Return the number of keys in the database
     *
     * @example
     * const { VultrexDB } = require("vultrex.db");
     * const db = new VultrexDB({
     * 		provider: new SQLiteProvider({ name: "main" })
     * });
     * await db.connect();
     * const size = await db.size;
    */
    async size() {
        return this.provider.size();
    }
    /**
     * Delete all keys from the database
     *
     * @example
     * const { VultrexDB } = require("vultrex.db");
     * const db = new VultrexDB({
     * 		provider: new SQLiteProvider({ name: "main" })
     * });
     * await db.connect();
     * await db.clear();
    */
    async clear() {
        this.checkReady();
        return this.provider.clear();
    }
    checkReady() {
        if (!this.provider.initialized) {
            throw new Error("[VultrexDB] Provider has not been initialized yet.");
        }
    }
}
exports.VultrexDB = VultrexDB;
