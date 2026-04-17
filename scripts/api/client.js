import { ROLES } from "../constants.js";
import { getServerUrl, getTechUsers, objectWithoutUndefined } from "../helpers/utils.js";
import {
  normalizeCardMeta,
  normalizeCardsList,
  normalizeLevels,
  normalizePlayersInfo,
  normalizePlayersList,
  normalizeRollCard
} from "./normalizers.js";

export class KriptaApiClient {
  static buildHeaders(role, extra = {}, { useAuth = true } = {}) {
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      ...extra
    };

    if (!useAuth) return objectWithoutUndefined(headers);

    const users = getTechUsers();
    const auth = users?.[role] ?? { id: "", key: "" };
    const basic = auth.id || auth.key ? btoa(`${auth.id}:${auth.key}`) : "";

    return objectWithoutUndefined({
      ...headers,
      Authorization: basic ? `Basic ${basic}` : "",
      Id: auth.id ?? "",
      Key: auth.key ?? "",
      "X-Api-Id": auth.id ?? "",
      "X-Api-Key": auth.key ?? "",
      "X-Auth-Id": auth.id ?? "",
      "X-Auth-Key": auth.key ?? "",
      "X-User-Id": auth.id ?? "",
      "X-User-Key": auth.key ?? ""
    });
  }

  static buildUrl(path, query = null) {
    const base = getServerUrl();
    const url = new URL(path, `${base}/`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") continue;
        if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
        else url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  static async request(role, path, { method = "GET", body, query, binary = false, headers = {}, useAuth = true } = {}) {
    const response = await fetch(this.buildUrl(path, query), {
      method,
      mode: "cors",
      headers: this.buildHeaders(role, headers, { useAuth }),
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch (_error) {}
      throw new Error(`API ${response.status}: ${details || response.statusText}`);
    }

    if (binary) return response.blob();
    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") || contentType.includes("text/json")) {
      return response.json();
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (_error) {
      return text;
    }
  }

  static async healthCheck() {
    return this.request(ROLES.READER, "/api/Health/check", {
      method: "GET",
      headers: { "Content-Type": undefined },
      useAuth: false
    });
  }

  static async checkMe() {
    return this.request(ROLES.READER, "/api/Health/check-me", {
      method: "GET",
      headers: { "Content-Type": undefined }
    });
  }

  static async getLevelsList() {
    return normalizeLevels(
      await this.request(ROLES.READER, "/api/Cards/getLevelsList", {
        method: "GET",
        headers: { "Content-Type": undefined }
      })
    );
  }

  static async getCardsList(level, search = "") {
    const body = objectWithoutUndefined({
      Level: level,
      level,
      LevelId: level,
      levelId: level,
      Search: search,
      search,
      Query: search,
      query: search,
      Name: search,
      name: search
    });

    return normalizeCardsList(
      await this.request(ROLES.READER, "/api/Cards/getCardsList", {
        method: "POST",
        body
      }),
      level
    );
  }

  static async getCardMeta(level, number) {
    return normalizeCardMeta(
      await this.request(ROLES.READER, `/api/Cards/getCardMeta/${level}/${number}`, {
        method: "GET",
        headers: { "Content-Type": undefined }
      }),
      { level, number }
    );
  }

  static async getCardImageBlob(level, number) {
    return this.request(ROLES.READER, `/api/Cards/getCardImage/${level}/${number}`, {
      method: "GET",
      binary: true,
      headers: { "Content-Type": undefined }
    });
  }

  static async getPlayersList() {
    return normalizePlayersList(
      await this.request(ROLES.WRITER, "/api/PlayersCards/getPlayersList", {
        method: "GET",
        headers: { "Content-Type": undefined }
      })
    );
  }

  static async getPlayersInfo(guids) {
    const uniqueGuids = [...new Set((Array.isArray(guids) ? guids : [guids]).filter(Boolean))];

    const raw = await this.request(ROLES.READER, "/api/PlayersCards/getPlayersInfo", {
      method: "POST",
      body: {
        players: uniqueGuids
      }
    });

    console.log("KRIPTA raw getPlayersInfo", raw);

    return normalizePlayersInfo(raw);
  }

  static async addPlayer(name, comment = "") {
    const body = objectWithoutUndefined({
      Name: name,
      name,
      Comment: comment,
      comment
    });

    return this.request(ROLES.WRITER, "/api/PlayersCards/addPlayer", {
      method: "POST",
      body
    });
  }

  static async updatePlayer(guid, name, comment = "") {
    const body = objectWithoutUndefined({
      Guid: guid,
      guid,
      Id: guid,
      id: guid,
      Name: name,
      name,
      Comment: comment,
      comment
    });

    return this.request(ROLES.WRITER, "/api/PlayersCards/updatePlayer", {
      method: "POST",
      body
    });
  }

  static async deletePlayer(guid) {
    const body = objectWithoutUndefined({
      Guid: guid,
      guid,
      Id: guid,
      id: guid
    });

    return this.request(ROLES.WRITER, "/api/PlayersCards/deletePlayer", {
      method: "DELETE",
      body
    });
  }

  static async rollCard(level) {
    const body = objectWithoutUndefined({
      Level: level,
      level,
      LevelId: level,
      levelId: level
    });

    return normalizeRollCard(
      await this.request(ROLES.READER, "/api/PlayersCards/rollCard", {
        method: "POST",
        body
      }),
      level
    );
  }

  static async giveCard(playerGuid, level, number, count = 1) {
    const query = objectWithoutUndefined({
      player: playerGuid,
      Player: playerGuid,
      guid: playerGuid,
      Guid: playerGuid,
      id: playerGuid,
      Id: playerGuid,
      playerGuid,
      PlayerGuid: playerGuid,
      level,
      Level: level,
      card: number,
      Card: number,
      number,
      Number: number,
      count,
      Count: count,
      amount: count,
      Amount: count
    });

    return this.request(ROLES.WRITER, "/api/PlayersCards/giveCard", {
      method: "POST",
      query,
      headers: { "Content-Type": undefined }
    });
  }

  static async takeCard(playerGuid, level, number, count = 1) {
    const query = objectWithoutUndefined({
      player: playerGuid,
      Player: playerGuid,
      guid: playerGuid,
      Guid: playerGuid,
      id: playerGuid,
      Id: playerGuid,
      playerGuid,
      PlayerGuid: playerGuid,
      level,
      Level: level,
      card: number,
      Card: number,
      number,
      Number: number,
      count,
      Count: count,
      amount: count,
      Amount: count
    });

    return this.request(ROLES.WRITER, "/api/PlayersCards/takeCard", {
      method: "POST",
      query,
      headers: { "Content-Type": undefined }
    });
  }

  static async testWriterAccess() {
    return this.getPlayersList();
  }
}
