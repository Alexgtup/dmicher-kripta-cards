export const MODULE_ID = "dmicher-kripta-cards";

export const SETTINGS = {
  SERVER_URL: "server-url",
  TECH_AUTH_USERS: "tech-auth-users",
  PLAYER_BINDINGS: "kripta-cards-players",
  UI_PREFS: "ui-prefs"
};

export const ROLES = {
  READER: "reader",
  WRITER: "writer"
};

export const VIEW_MODES = {
  TABLE: "table",
  TILES: "tiles"
};

export const CHAT_ACTIONS = {
  REQUEST_CARD: "request-card"
};

export const DEFAULT_UI_PREFS = {
  myCardsViewMode: VIEW_MODES.TILES,
  catalogViewMode: VIEW_MODES.TILES
};

export const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates`;
