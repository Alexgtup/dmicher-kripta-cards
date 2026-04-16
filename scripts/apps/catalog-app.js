import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT, VIEW_MODES } from "../constants.js";
import { KriptaCardDetailsApp } from "./card-details-app.js";
import { KriptaGiveCardDialog } from "./give-card-dialog.js";
import { createKriptaChatMessage } from "../helpers/chat.js";
import { chooseBoundUserDialog } from "./dialogs.js";
import { getBindings, getUiPrefs, notifyError, notifyWarn, setUiPref, stripHtml } from "../helpers/utils.js";

export class KriptaCatalogApp extends Application {
  constructor(options = {}) {
    super(options);
    this.levels = [];
    this.selectedLevel = null;
    this.search = "";
    this.viewMode = getUiPrefs().catalogViewMode ?? VIEW_MODES.TILES;
    this.cards = [];
    this.items = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-catalog`,
      title: "Каталог карточек",
      template: `${TEMPLATE_ROOT}/catalog-app.hbs`,
      classes: [MODULE_ID, "sheet"],
      width: 1040,
      height: 760,
      resizable: true
    });
  }

  async getData() {
    this.levels = await KriptaApiClient.getLevelsList();
    if (!this.levels.length) return { emptyState: true };
    if (this.selectedLevel === null) this.selectedLevel = this.levels[0].id;

    this.cards = await KriptaApiClient.getCardsList(this.selectedLevel, this.search);
    const imageBlobs = await Promise.all(this.cards.map((card) => KriptaApiClient.getCardImageBlob(card.level, card.number).catch(() => null)));
    this.items = this.cards.map((card, index) => ({
      ...card,
      imageUrl: imageBlobs[index] ? URL.createObjectURL(imageBlobs[index]) : "",
      descriptionText: stripHtml(card.description ?? "")
    }));

    const activeLevel = this.levels.find((item) => item.id === this.selectedLevel) ?? this.levels[0];
    return {
      emptyState: false,
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

    html.find('[data-level-id]').on("click", async (event) => {
      this.selectedLevel = Number(event.currentTarget.dataset.levelId);
      this.render();
    });

    html.find('[name="search"]').on("input", foundry.utils.debounce((event) => {
      this.search = String(event.currentTarget.value ?? "");
      this.render();
    }, 300));

    html.find('[data-action="set-view"]').on("click", async (event) => {
      this.viewMode = event.currentTarget.dataset.view;
      await setUiPref("catalogViewMode", this.viewMode);
      this.render();
    });

    html.find('[data-action="refresh"]').on("click", () => this.render());

    html.find('[data-action="output"]').on("click", async (event) => {
      const item = this._findItem(event);
      if (!item) return;
      try {
        const levelName = this.levels.find((level) => level.id === item.level)?.name ?? String(item.level);
        await createKriptaChatMessage({
          title: "Справка",
          subtitle: `${item.name} (${levelName})`,
          imageUrl: item.imageUrl,
          description: item.description,
          speakerUser: game.user
        });
      } catch (error) {
        notifyError(error, "Не удалось вывести карточку в чат");
      }
    });

    html.find('[data-action="info"]').on("click", (event) => {
      const item = this._findItem(event);
      if (!item) return;
      new KriptaCardDetailsApp({ level: item.level, number: item.number }).render(true);
    });

    html.find('[data-action="give"]').on("click", async (event) => {
      const item = this._findItem(event);
      if (!item) return;
      const bindings = getBindings();
      const rows = Object.entries(bindings).map(([foundryUserId, binding]) => ({
        foundryUserId,
        foundryUserName: game.users.get(foundryUserId)?.name ?? binding.name ?? foundryUserId,
        guid: binding.guid
      })).filter((entry) => entry.guid);

      const foundryUserId = await chooseBoundUserDialog(rows);
      if (!foundryUserId) return notifyWarn("Игрок для выдачи не выбран");
      const binding = bindings[foundryUserId];
      new KriptaGiveCardDialog({
        playerGuid: binding.guid,
        ownerFoundryUserId: foundryUserId,
        playerName: game.users.get(foundryUserId)?.name ?? binding.name ?? "",
        initialLevel: item.level,
        initialNumber: item.number
      }).render(true);
    });

    html.find('.kripta-card-tile').on("click", (event) => {
      if ($(event.target).closest('button').length) return;
      const card = event.currentTarget.closest('[data-card-key]')?.dataset?.cardKey;
      if (!card) return;
      const [level, number] = card.split(':').map(Number);
      new KriptaCardDetailsApp({ level, number }).render(true);
    });
  }

  _findItem(event) {
    const cardKey = event.currentTarget.closest('[data-card-key]')?.dataset?.cardKey;
    return this.items.find((item) => `${item.level}:${item.number}` === cardKey);
  }
}
