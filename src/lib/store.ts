import { RedisClientType } from "redis";

import type { UserResult } from "~/types";

class Store {
  USER_KEY = "user";

  getKey(username: string) {
    return `${this.USER_KEY}:${username}`;
  }

  private serialize(list: UserResult[]) {
    const stringified = JSON.stringify(list);
    return stringified;
  }

  private deserialize(list: string) {
    // TODO: use a safer way to parse JSON
    const parsed = JSON.parse(list) as UserResult[];
    return parsed;
  }

  constructor(public _client: RedisClientType) {}

  async addUser(username: string, results: UserResult[]) {
    await this._client.set(this.getKey(username), this.serialize(results));
    return results;
  }

  async getUser(username: string) {
    const result = await this._client.get(this.getKey(username));
    return result ? this.deserialize(result) : undefined;
  }

  async deleteUser(username: string) {
    const result = await this._client.del(this.getKey(username));
    return result === 1;
  }

  async isInStore(username: string) {
    const result = await this._client.exists(this.getKey(username));
    return result === 1;
  }

  async debug() {
    const keys = await this._client.keys("user:*");
    return keys;
  }
}

export default Store;
