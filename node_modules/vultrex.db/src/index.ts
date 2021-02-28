import { RowData } from "./interfaces/RowData";

const load = (options: VultrexDBOptions): any => {
	const providers: Record<string, string>  = {
		sqlite: './providers/SQLiteProvider',
		mongodb: './providers/MongoDBProvider'
	}
	if (typeof options.provider !== 'undefined') {
		return providers[options.provider];
	}
}

interface VultrexDBOptions {
	provider: string;
	table?: string;
	fileName?: string;
	collection?: string;
	url?: string;
}

export class VultrexDB {
	private provider: any;
	public constructor(options: VultrexDBOptions) {
		const Provider  = require(load(options)).default;
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
	public async connect(): Promise<void> {
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
	public async get<T>(key: string | number, defaultValue: any): Promise<T> {
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
	public async getAll(key: string | number): Promise<RowData[]> {
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
	public async set(key: string | number, value: any) {
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
	public async delete(key: string | number): Promise<void> {
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
	public async size(): Promise<number> {
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
	public async clear(): Promise<void> {
		this.checkReady();
		return this.provider.clear();
	}

	private checkReady() {
		if (!this.provider.initialized) {
			throw new Error("[VultrexDB] Provider has not been initialized yet.");
		}
	}
}