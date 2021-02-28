import { MongoClient, Db, Collection } from "mongodb";
import { RowData } from "../interfaces/RowData";

interface MongoDBProviderOptions {
	url: string;
	collection: string | 'vultrexdb';
}

export default class MongoDBProvider {
	private url: string;
	private collection: string;
	private client: MongoClient;
	private db: Db;
	private coll: Collection;
	public initialized: boolean = false;
	public constructor(options: MongoDBProviderOptions) {
		this.url = options.url;
		this.collection = options.collection || "Vultrex";
	}

	public async init() {
		this.client = new MongoClient(this.url, { useUnifiedTopology: true });
		await this.client.connect();
		this.db = this.client.db();
		this.coll = this.db.collection(this.collection);
		this.initialized = true;
	}

	public async set(key: string | number, value: any) {
		this.coll.updateOne({ _id: key }, { $set: { _id: key, value } }, { upsert: true });
	}

	public async get<T>(key: string | number, defaultValue: any): Promise<T> {
		const data = await this.coll.findOne({ _id: key });
		return data !== null ? data.value : defaultValue;
	}

	public async getAll(key: string | number): Promise<RowData[]> {
		const data = key ? await this.coll.find({ "key": /^${key}/ }).toArray() : await this.coll.find({}).toArray();
		return data.map((data: any) => ({ key: data["_id"], value: data["value"] }));
	}

	public async size(): Promise<number> {
		return this.coll.countDocuments();
	}

	public async delete(key: string | number): Promise<void> {
		this.coll.deleteOne({ _id: key });
	}

	public async clear(): Promise<void> {
		this.coll.drop();
	}
}