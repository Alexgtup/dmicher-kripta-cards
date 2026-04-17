function firstOf(object, keys, fallback = undefined) {
  for (const key of keys) {
    if (object && Object.hasOwn(object, key) && object[key] !== undefined && object[key] !== null) return object[key];
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

export function normalizeLevels(value) {
  return arrayFromUnknown(value).map((item) => ({
    id: Number(firstOf(item, ["id", "Id", "level", "Level"], 0)),
    name: String(firstOf(item, ["name", "Name"], "")),
    description: String(firstOf(item, ["description", "Description"], ""))
  })).sort((a, b) => a.id - b.id);
}

export function normalizeCardMeta(value, fallback = {}) {
  return {
    level: Number(firstOf(value, ["level", "Level"], fallback.level ?? 0)),
    number: Number(firstOf(value, ["number", "Number", "card", "Card"], fallback.number ?? 0)),
    name: String(firstOf(value, ["name", "Name"], fallback.name ?? "")),
    description: String(firstOf(value, ["description", "Description"], fallback.description ?? "")),
    image: String(firstOf(value, ["image", "Image", "imageUrl", "ImageUrl"], fallback.image ?? ""))
  };
}

export function normalizeCardsList(value, fallbackLevel = null) {
  return arrayFromUnknown(value).map((item) => normalizeCardMeta(item, { level: fallbackLevel ?? 0 }));
}

function normalizePlayerCard(item) {
  return {
    level: Number(firstOf(item, ["level", "Level"], 0)),
    number: Number(firstOf(item, ["number", "Number", "card", "Card"], 0)),
    count: Number(firstOf(item, ["count", "Count", "amount", "Amount"], 1))
  };
}

export function normalizePlayersList(value) {
  return arrayFromUnknown(value).map((item) => ({
    guid: String(firstOf(item, ["guid", "Guid", "id", "Id"], "")),
    name: String(firstOf(item, ["name", "Name"], "")),
    comment: String(firstOf(item, ["comment", "Comment"], "")),
    cardsCount: Number(firstOf(item, ["cardsCount", "CardsCount", "cardsTypesCount", "CardsTypesCount", "cards", "Cards"], 0))
  }));
}

export function normalizePlayersInfo(value) {
  return arrayFromUnknown(value).map((item) => {
    const nestedCards = firstOf(item, ["playerCards", "PlayerCards", "cards", "Cards", "cardsList", "CardsList"], []);
    return {
      guid: String(firstOf(item, ["guid", "Guid", "id", "Id"], "")),
      name: String(firstOf(item, ["name", "Name"], "")),
      comment: String(firstOf(item, ["comment", "Comment"], "")),
      playerCards: arrayFromUnknown(nestedCards).map(normalizePlayerCard)
    };
  });
}

export function normalizeRollCard(value, fallbackLevel = 0) {
  const nestedCandidate =
    firstOf(value, ["cardMeta", "CardMeta", "card", "Card", "result", "Result", "data", "Data", "value", "Value"], null) ?? value;

  const meta = normalizeCardMeta(nestedCandidate, { level: fallbackLevel });

  if (!meta.level) {
    meta.level = Number(firstOf(value, ["level", "Level"], fallbackLevel));
  }

  if (!meta.number) {
    meta.number = Number(firstOf(value, ["number", "Number", "card", "Card"], 0));
  }

  if (!meta.name) {
    meta.name = String(firstOf(value, ["name", "Name"], ""));
  }

  if (!meta.description) {
    meta.description = String(firstOf(value, ["description", "Description"], ""));
  }

  return meta;
}
