import { RowData } from "../interfaces/RowData";
interface MongoDBProviderOptions {
    url: string;
    collection: string | 'vultrexdb';
}
export default class MongoDBProvider {
    private url;
    private collection;
    private client;
    private db;
    private coll;
    initialized: boolean;
    constructor(options: MongoDBProviderOptions);
    init(): Promise<void>;
    set(key: string | number, value: any): Promise<void>;
    get<T>(key: string | number, defaultValue: any): Promise<T>;
    getAll(key: string | number): Promise<RowData[]>;
    size(): Promise<number>;
    delete(key: string | number): Promise<void>;
    clear(): Promise<void>;
}
export {};
