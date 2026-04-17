import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT, VIEW_MODES } from "../constants.js";
import { countPromptDialog } from "./dialogs.js";
import { KriptaCardDetailsApp } from "./card-details-app.js";
import { KriptaRequestCardDialog } from "./request-card-dialog.js";
import { KriptaUseCardDialog } from "./use-card-dialog.js";
import { getUiPrefs, notifyError, notifyInfo, setUiPref, stripHtml } from "../helpers/utils.js";

function isValidOwnedCard(card) {
  const level = Number(card?.level);
  const number = Number(card?.number);
  const count = Number(card?.count ?? 1);

  return Number.isInteger(level) && level >= 0 &&
    Number.isInteger(number) && number > 0 &&
    Number.isFinite(count) && count > 0;
}

export class KriptaMyCardsApp extends Application {
  constructor(options = {}) {
    super(options);
    this.playerGuid = options.playerGuid;
    this.playerName = options.playerName ?? game.user.name;
    this.ownerFoundryUserId = options.ownerFoundryUserId ?? game.user.id;
    this.search = "";
    this.levels = [];
    this.selectedLevel = null;
    this.items = [];
    this.viewMode = getUiPrefs().myCardsViewMode ?? VIEW_MODES.TILES;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-my-cards-${foundry.utils.randomID()}`,
      title: "Карточки игрока",
      template: `${TEMPLATE_ROOT}/my-cards-app.hbs`,
      classes: [MODULE_ID, "sheet"],
      width: 1040,
      height: 760,
      resizable: true
    });
  }

  async getData() {
    const [levels, infoList] = await Promise.all([
      KriptaApiClient.getLevelsList(),
      KriptaApiClient.getPlayersInfo([this.playerGuid])
    ]);

    this.levels = levels;
    if (!this.levels.length) return { emptyState: true };

    if (this.selectedLevel === null) this.selectedLevel = this.levels[0].id;

    const player = infoList[0] ?? { playerCards: [] };

    console.log("KRIPTA myCards raw player JSON", JSON.stringify(player, null, 2));
    console.log("KRIPTA myCards raw playerCards JSON", JSON.stringify(player.playerCards, null, 2));

    const rawCards = Array.isArray(player.playerCards) ? player.playerCards : [];
    const validCards = rawCards.filter(isValidOwnedCard);
    const invalidCards = rawCards.filter((card) => !isValidOwnedCard(card));

    if (invalidCards.length) {
      console.warn("KRIPTA myCards invalid cards filtered JSON", JSON.stringify(invalidCards, null, 2));
    }

    const groupedCards = validCards.reduce((map, card) => {
      const key = `${card.level}:${card.number}`;
      if (!map.has(key)) {
        map.set(key, {
          level: Number(card.level),
          number: Number(card.number),
          count: 0
        });
      }
      map.get(key).count += Number(card.count ?? 1);
      return map;
    }, new Map());

    const list = [...groupedCards.values()].filter((item) => item.level === this.selectedLevel);

    const metaList = await Promise.all(
      list.map((item) =>
        KriptaApiClient.getCardMeta(item.level, item.number).catch(() => ({
          level: item.level,
          number: item.number,
          name: `Карточка ${item.number}`,
          description: ""
        }))
      )
    );

    const imageBlobs = await Promise.all(
      list.map((item) => KriptaApiClient.getCardImageBlob(item.level, item.number).catch(() => null))
    );

    const searchLower = this.search.trim().toLowerCase();

    this.items = list.map((item, index) => ({
      ...item,
      ...metaList[index],
      imageUrl: imageBlobs[index] ? URL.createObjectURL(imageBlobs[index]) : "",
      descriptionText: stripHtml(metaList[index]?.description ?? "")
    })).filter((item) => {
      if (!searchLower) return true;
      return item.name.toLowerCase().includes(searchLower) || item.descriptionText.toLowerCase().includes(searchLower);
    });

    const activeLevel = this.levels.find((item) => item.id === this.selectedLevel) ?? this.levels[0];

    return {
      emptyState: false,
      playerName: this.playerName,
      levels: this.levels.map((item) => ({ ...item, isActive: item.id === activeLevel.id })),
      activeLevel,
      items: this.items,
      search: this.search,
      isTiles: this.viewMode === VIEW_MODES.TILES,
      isTable: this.viewMode === VIEW_MODES.TABLE,
      isGM: game.user.isGM
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[data-level-id]').on("click", (event) => {
      this.selectedLevel = Number(event.currentTarget.dataset.levelId);
      this.render();
    });

    html.find('[name="search"]').on("input", foundry.utils.debounce((event) => {
      this.search = String(event.currentTarget.value ?? "");
      this.render();
    }, 300));

    html.find('[data-action="set-view"]').on("click", async (event) => {
      this.viewMode = event.currentTarget.dataset.view;
      await setUiPref("myCardsViewMode", this.viewMode);
      this.render();
    });

    html.find('[data-action="refresh"]').on("click", () => this.render());

    html.find('[data-action="request"]').on("click", () => {
      new KriptaRequestCardDialog({
        playerGuid: this.playerGuid,
        ownerFoundryUserId: this.ownerFoundryUserId
      }).render(true);
    });

    html.find('[data-action="use"]').on("click", (event) => {
      const item = this._findItem(event);
      if (!item) return;

      new KriptaUseCardDialog({
        playerGuid: this.playerGuid,
        playerName: this.playerName,
        ownerFoundryUserId: this.ownerFoundryUserId,
        level: item.level,
        number: item.number,
        onComplete: () => this.render()
      }).render(true);
    });

    html.find('[data-action="info"]').on("click", (event) => {
      const item = this._findItem(event);
      if (!item) return;
      new KriptaCardDetailsApp({ level: item.level, number: item.number }).render(true);
    });

    html.find('[data-action="take"]').on("click", async (event) => {
      const item = this._findItem(event);
      if (!item) return;

      const count = await countPromptDialog({
        title: "Забрать карточку",
        message: `Игрок ${this.playerName} будет лишён карточки ${item.name}.`,
        max: item.count,
        defaultValue: 1
      });

      if (!count) return;

      try {
        await KriptaApiClient.takeCard(this.playerGuid, item.level, item.number, count);
        notifyInfo("Карточка списана.");
        this.render();
      } catch (error) {
        notifyError(error, "Не удалось списать карточку");
      }
    });

    html.find('.kripta-card-tile').on("click", (event) => {
      if ($(event.target).closest("button").length) return;
      const cardKey = event.currentTarget.closest("[data-card-key]")?.dataset?.cardKey;
      if (!cardKey) return;
      const [level, number] = cardKey.split(":").map(Number);
      new KriptaCardDetailsApp({ level, number }).render(true);
    });
  }

  _findItem(event) {
    const cardKey = event.currentTarget.closest("[data-card-key]")?.dataset?.cardKey;
    return this.items.find((item) => `${item.level}:${item.number}` === cardKey);
  }
}
