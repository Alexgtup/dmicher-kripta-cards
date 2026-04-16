import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";
import { createCardRequestMessage } from "../helpers/chat.js";
import { notifyError, notifyInfo } from "../helpers/utils.js";

export class KriptaRequestCardDialog extends FormApplication {
  constructor(options = {}) {
    super(options);
    this.playerGuid = options.playerGuid;
    this.ownerFoundryUserId = options.ownerFoundryUserId ?? game.user.id;
    this.initialLevel = options.initialLevel ?? null;
    this.initialNumber = options.initialNumber ?? null;
    this.mode = this.initialLevel !== null && this.initialNumber !== null ? "manual" : "random";
    this.levels = [];
    this.cards = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-request-card`,
      title: "Получить карточку",
      template: `${TEMPLATE_ROOT}/request-card-dialog.hbs`,
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
        const selectedLevel = Number(html.find('[name="level"]').val());
        this.cards = await KriptaApiClient.getCardsList(selectedLevel, "");
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
      let picked = null;

      if (data.mode === "manual") {
        const number = Number(data.cardNumber);
        picked = await KriptaApiClient.getCardMeta(level, number);
      } else {
        picked = await KriptaApiClient.rollCard(level);
      }

      const [levels, imageBlob] = await Promise.all([
        this.levels.length ? this.levels : KriptaApiClient.getLevelsList(),
        KriptaApiClient.getCardImageBlob(picked.level, picked.number).catch(() => null)
      ]);

      const imageUrl = imageBlob ? URL.createObjectURL(imageBlob) : "";
      const levelName = levels.find((item) => item.id === picked.level)?.name ?? String(picked.level);
      const title = data.mode === "manual"
        ? `Выбрана карта: ${picked.name} (${levelName})`
        : `Случайная карта: ${picked.name} (${levelName})`;

      await createCardRequestMessage({
        playerGuid: this.playerGuid,
        ownerFoundryUserId: this.ownerFoundryUserId,
        level: picked.level,
        number: picked.number,
        playerName: game.users.get(this.ownerFoundryUserId)?.name ?? game.user.name,
        title,
        levelName,
        imageUrl,
        description: picked.description,
        speakerUser: game.user
      });

      notifyInfo("Запрос карточки отправлен в чат.");
    } catch (error) {
      notifyError(error, "Не удалось отправить запрос карточки");
    }
  }
}
