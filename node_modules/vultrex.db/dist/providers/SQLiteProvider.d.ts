import { RowData } from "../interfaces/RowData";
interface SQLiteProviderOptions {
    table: string | 'vultrexdb';
    fileName: string | 'vultrexdb';
}
export default class SQLiteProvider {
    private db;
    table: string;
    fileName: string;
    initialized: boolean;
    constructor(config: SQLiteProviderOptions);
    init(): Promise<void>;
    set(key: string | number, value: any): Promise<void>;
    get<T>(key: string | number, defaultValue: any): Promise<T>;
    getAll(key: string | number): Promise<RowData[]>;
    size(): Promise<any>;
    delete(key: string | number): Promise<void>;
    clear(): Promise<void>;
}
export {};
