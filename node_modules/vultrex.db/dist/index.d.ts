import { RowData } from "./interfaces/RowData";
interface VultrexDBOptions {
    provider: string;
    table?: string;
    fileName?: string;
    collection?: string;
    url?: string;
}
export declare class VultrexDB {
    private provider;
    constructor(options: VultrexDBOptions);
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
    connect(): Promise<void>;
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
    get<T>(key: string | number, defaultValue: any): Promise<T>;
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
    getAll(key: string | number): Promise<RowData[]>;
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
    set(key: string | number, value: any): Promise<any>;
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
    delete(key: string | number): Promise<void>;
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
    size(): Promise<number>;
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
    clear(): Promise<void>;
    private checkReady;
}
export {};
