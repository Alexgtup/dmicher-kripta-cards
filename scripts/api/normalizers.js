function firstOf(object, keys, fallback = undefined) {
  for (const key of keys) {
    if (object && Object.hasOwn(object, key) && object[key] !== undefined && object[key] !== null) {
      return object[key];
    }
  }
  return fallback;
}

function arrayFromUnknown(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function ensureArray(value) {
  const arr = arrayFromUnknown(value);
  if (arr.length) return arr;
  if (value && typeof value === "object") return [value];
  return [];
}

export function normalizeLevels(value) {
  return ensureArray(value).map((item) => ({
    id: Number(firstOf(item, ["id", "Id", "level", "Level"], 0)),
    name: String(firstOf(item, ["name", "Name"], "")),
    description: String(firstOf(item, ["description", "Description"], ""))
  })).sort((a, b) => a.id - b.id);
}

export function normalizeCardMeta(value, fallback = {}) {
  const source =
    firstOf(value, ["cardMeta", "CardMeta", "card", "Card", "value", "Value"], null) ??
    value;

  return {
    level: Number(firstOf(source, ["level", "Level", "cardLevel", "CardLevel"], fallback.level ?? 0)),
    number: Number(firstOf(source, ["number", "Number", "card", "Card", "cardNumber", "CardNumber"], fallback.number ?? 0)),
    name: String(firstOf(source, ["name", "Name"], fallback.name ?? "")),
    description: String(firstOf(source, ["description", "Description"], fallback.description ?? "")),
    image: String(firstOf(source, ["image", "Image", "imageUrl", "ImageUrl"], fallback.image ?? ""))
  };
}

export function normalizeCardsList(value, fallbackLevel = null) {
  return ensureArray(value).map((item) => normalizeCardMeta(item, { level: fallbackLevel ?? 0 }));
}

function normalizePlayerCard(item) {
  return {
    level: Number(firstOf(item, ["level", "Level", "cardLevel", "CardLevel"], 0)),
    number: Number(firstOf(item, ["number", "Number", "card", "Card", "cardNumber", "CardNumber"], 0)),
    count: Number(firstOf(item, ["count", "Count", "amount", "Amount", "qty", "Qty", "quantity", "Quantity"], 1))
  };
}

export function normalizePlayersList(value) {
  return ensureArray(value).map((item) => {
    const source =
      firstOf(item, ["player", "Player", "value", "Value"], null) ??
      item;

    return {
      guid: String(firstOf(source, ["guid", "Guid", "id", "Id"], "")),
      name: String(firstOf(source, ["name", "Name"], "")),
      comment: String(firstOf(source, ["comment", "Comment"], "")),
      cardsCount: Number(firstOf(source, ["cardsCount", "CardsCount", "cardsTypesCount", "CardsTypesCount", "cards", "Cards"], 0))
    };
  });
}

export function normalizePlayersInfo(value) {
  return ensureArray(value).map((item) => {
    const source =
      firstOf(item, ["player", "Player", "value", "Value", "dto", "Dto"], null) ??
      item;

    const nestedCards =
      firstOf(item, ["playerCards", "PlayerCards", "playersCards", "PlayersCards", "cards", "Cards", "cardsList", "CardsList", "inventory", "Inventory"], null) ??
      firstOf(source, ["playerCards", "PlayerCards", "playersCards", "PlayersCards", "cards", "Cards", "cardsList", "CardsList", "inventory", "Inventory"], []);

    return {
      guid: String(firstOf(source, ["guid", "Guid", "id", "Id"], "")),
      name: String(firstOf(source, ["name", "Name"], "")),
      comment: String(firstOf(source, ["comment", "Comment"], "")),
      playerCards: ensureArray(nestedCards).map(normalizePlayerCard)
    };
  });
}

export function normalizeRollCard(value, fallbackLevel = 0) {
  const meta = normalizeCardMeta(value, { level: fallbackLevel });

  if (!meta.level) {
    meta.level = Number(firstOf(value, ["level", "Level"], fallbackLevel));
  }

  if (!meta.number) {
    meta.number = Number(firstOf(value, ["number", "Number", "card", "Card"], 0));
  }

  return meta;
}
