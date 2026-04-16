import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";
import { createKriptaChatMessage } from "../helpers/chat.js";
import { notifyError, notifyInfo } from "../helpers/utils.js";

export class KriptaGiveCardDialog extends FormApplication {
  constructor(options = {}) {
    super(options);
    this.playerGuid = options.playerGuid;
    this.playerName = options.playerName ?? "";
    this.ownerFoundryUserId = options.ownerFoundryUserId ?? game.user.id;
    this.onComplete = options.onComplete ?? (() => {});
    this.initialLevel = options.initialLevel ?? null;
    this.initialNumber = options.initialNumber ?? null;
    this.mode = this.initialLevel !== null && this.initialNumber !== null ? "manual" : "random";
    this.levels = [];
    this.cards = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-give-card`,
      title: "Выдать карточку",
      template: `${TEMPLATE_ROOT}/give-card-dialog.hbs`,
      classes: [MODULE_ID, "sheet"],
      width: 520,
      height: "auto",
      closeOnSubmit: true
    });
  }

  async getData() {
    this.levels = await KriptaApiClient.getLevelsList();
    const selectedLevel = this.initialLevel ?? this.levels[0]?.id ?? 0;
    if (this.mode === "manual") this.cards = await KriptaApiClient.getCardsList(selectedLevel, "");
    return {
      levels: this.levels,
      cards: this.cards,
      selectedLevel,
      selectedNumber: this.initialNumber ?? this.cards[0]?.number ?? "",
      isManual: this.mode === "manual"
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[name="mode"]').on("change", async (event) => {
      this.mode = event.currentTarget.value;
      if (this.mode === "manual") {
        const level = Number(html.find('[name="level"]').val());
        this.cards = await KriptaApiClient.getCardsList(level, "");
      } else {
        this.cards = [];
      }
      this.render();
    });

    html.find('[name="level"]').on("change", async (event) => {
      if (this.mode !== "manual") return;
      const level = Number(event.currentTarget.value);
      this.cards = await KriptaApiClient.getCardsList(level, "");
      this.render();
    });
  }

  async _updateObject(_event, formData) {
    const data = foundry.utils.expandObject(formData);
    try {
      const level = Number(data.level);
      const card = data.mode === "manual"
        ? await KriptaApiClient.getCardMeta(level, Number(data.cardNumber))
        : await KriptaApiClient.rollCard(level);

      await KriptaApiClient.giveCard(this.playerGuid, card.level, card.number, 1);

      const [levels, imageBlob] = await Promise.all([
        this.levels.length ? this.levels : KriptaApiClient.getLevelsList(),
        KriptaApiClient.getCardImageBlob(card.level, card.number).catch(() => null)
      ]);
      const imageUrl = imageBlob ? URL.createObjectURL(imageBlob) : "";
      const levelName = levels.find((item) => item.id === card.level)?.name ?? String(card.level);

      await createKriptaChatMessage({
        title: `Игрок ${this.playerName} получает карточку ${card.name} (${levelName})`,
        imageUrl,
        description: card.description,
        speakerUser: game.user
      });

      notifyInfo("Карточка выдана.");
      this.onComplete();
    } catch (error) {
      notifyError(error, "Не удалось выдать карточку");
    }
  }
}
