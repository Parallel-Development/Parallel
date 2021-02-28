"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
class MongoDBProvider {
    constructor(options) {
        this.initialized = false;
        this.url = options.url;
        this.collection = options.collection || "Vultrex";
    }
    async init() {
        this.client = new mongodb_1.MongoClient(this.url, { useUnifiedTopology: true });
        await this.client.connect();
        this.db = this.client.db();
        this.coll = this.db.collection(this.collection);
        this.initialized = true;
    }
    async set(key, value) {
        this.coll.updateOne({ _id: key }, { $set: { _id: key, value } }, { upsert: true });
    }
    async get(key, defaultValue) {
        const data = await this.coll.findOne({ _id: key });
        return data !== null ? data.value : defaultValue;
    }
    async getAll(key) {
        const data = key ? await this.coll.find({ "key": /^${key}/ }).toArray() : await this.coll.find({}).toArray();
        return data.map((data) => ({ key: data["_id"], value: data["value"] }));
    }
    async size() {
        return this.coll.countDocuments();
    }
    async delete(key) {
        this.coll.deleteOne({ _id: key });
    }
    async clear() {
        this.coll.drop();
    }
}
exports.default = MongoDBProvider;
