import { DEFAULT_UI_PREFS, MODULE_ID, SETTINGS } from "../constants.js";

export function getServerUrl() {
  const value = game.settings.get(MODULE_ID, SETTINGS.SERVER_URL) ?? "";
  return String(value).trim().replace(/\/+$/, "");
}

export async function setServerUrl(value) {
  return game.settings.set(MODULE_ID, SETTINGS.SERVER_URL, String(value ?? "").trim());
}

export function getTechUsers() {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTINGS.TECH_AUTH_USERS) ?? {
    writer: { id: "", key: "" },
    reader: { id: "", key: "" }
  });
}

export async function setTechUsers(value) {
  return game.settings.set(MODULE_ID, SETTINGS.TECH_AUTH_USERS, value);
}

export function getBindings() {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTINGS.PLAYER_BINDINGS) ?? {});
}

export async function setBinding(foundryUserId, playerInfo) {
  const bindings = getBindings();
  bindings[foundryUserId] = {
    guid: playerInfo.guid ?? playerInfo.id ?? "",
    name: playerInfo.name ?? "",
    comment: playerInfo.comment ?? ""
  };
  return game.settings.set(MODULE_ID, SETTINGS.PLAYER_BINDINGS, bindings);
}

export async function clearBinding(foundryUserId) {
  const bindings = getBindings();
  delete bindings[foundryUserId];
  return game.settings.set(MODULE_ID, SETTINGS.PLAYER_BINDINGS, bindings);
}

export function getBinding(foundryUserId) {
  return getBindings()[foundryUserId] ?? null;
}

export function getCurrentUserBinding() {
  return getBinding(game.user.id);
}

export function getUiPrefs() {
  return foundry.utils.mergeObject(DEFAULT_UI_PREFS, game.settings.get(MODULE_ID, SETTINGS.UI_PREFS) ?? {});
}

export async function setUiPref(key, value) {
  const prefs = getUiPrefs();
  prefs[key] = value;
  return game.settings.set(MODULE_ID, SETTINGS.UI_PREFS, prefs);
}

export function notifyInfo(message) {
  ui.notifications?.info(message);
}

export function notifyWarn(message) {
  ui.notifications?.warn(message);
}

export function notifyError(error, fallback = "Произошла ошибка") {
  console.error(error);
  const message = error?.message || error?.toString?.() || fallback;
  ui.notifications?.error(message);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function getRollModeForUser(_user = game.user) {
  return game.settings.get("core", "rollMode") ?? CONST.DICE_ROLL_MODES.PUBLIC;
}

export function buildWhisperRecipients(speakerUser = game.user) {
  const gmRecipients = ChatMessage.getWhisperRecipients("GM") ?? [];
  const result = new Map(gmRecipients.map((user) => [user.id, user]));
  if (speakerUser) result.set(speakerUser.id, speakerUser);
  return [...result.keys()];
}

export function getFoundryUsersForBinding() {
  return [...game.users].map((user) => ({
    id: user.id,
    name: user.name,
    isGM: user.isGM,
    active: user.active
  }));
}

export function objectWithoutUndefined(source) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}
