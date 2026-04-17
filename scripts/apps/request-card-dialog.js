import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";
import { createCardRequestMessage } from "../helpers/chat.js";
import { getBinding, notifyInfo } from "../helpers/utils.js";

export class KriptaRequestCardDialog extends FormApplication {
  constructor(options = {}) {
    super(options);

    this.playerGuid = options.playerGuid ?? "";
    this.ownerFoundryUserId = options.ownerFoundryUserId ?? game.user.id;

    this.initialLevel = options.initialLevel ?? null;
    this.initialNumber = options.initialNumber ?? null;

    this.selectedLevel = options.initialLevel ?? null;
    this.selectedNumber = options.initialNumber ?? null;

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

    if (this.selectedLevel === null || this.selectedLevel === undefined) {
      this.selectedLevel = this.levels[0]?.id ?? 0;
    }

    if (this.mode === "manual") {
      this.cards = await KriptaApiClient.getCardsList(this.selectedLevel, "");
      if (
        (this.selectedNumber === null || this.selectedNumber === undefined || this.selectedNumber === "") &&
        this.cards.length
      ) {
        this.selectedNumber = this.cards[0].number;
      }
    } else {
      this.cards = [];
    }

    return {
      levels: this.levels,
      cards: this.cards,
      selectedLevel: this.selectedLevel,
      selectedNumber: this.selectedNumber ?? "",
      isManual: this.mode === "manual"
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[name="mode"]').on("change", async (event) => {
      this.mode = String(event.currentTarget.value);

      const levelFromForm = Number(html.find('[name="level"]').val());
      if (!Number.isNaN(levelFromForm)) this.selectedLevel = levelFromForm;

      if (this.mode === "manual") {
        this.cards = await KriptaApiClient.getCardsList(this.selectedLevel, "");
        this.selectedNumber = this.cards[0]?.number ?? null;
      } else {
        this.cards = [];
        this.selectedNumber = null;
      }

      this.render();
    });

    html.find('[name="level"]').on("change", async (event) => {
      this.selectedLevel = Number(event.currentTarget.value);

      if (this.mode === "manual") {
        this.cards = await KriptaApiClient.getCardsList(this.selectedLevel, "");
        this.selectedNumber = this.cards[0]?.number ?? null;
        this.render();
      }
    });

    html.find('[name="cardNumber"]').on("change", (event) => {
      this.selectedNumber = Number(event.currentTarget.value);
    });
  }

  async _updateObject(_event, formData) {
    const data = foundry.utils.expandObject(formData);

    const selectedLevel = Number(
      data.level ??
      this.selectedLevel ??
      this.initialLevel ??
      0
    );

    const mode = String(
      data.mode ??
      this.mode ??
      "random"
    );

    let playerGuid = this.playerGuid;
    const ownerFoundryUserId = this.ownerFoundryUserId ?? game.user.id;

    if (!playerGuid) {
      const binding = getBinding(ownerFoundryUserId);
      playerGuid = binding?.guid ?? binding?.playerGuid ?? "";
    }

    let chosenCard = null;

    if (mode === "manual") {
      const selectedNumber = Number(
        data.cardNumber ??
        this.selectedNumber ??
        this.initialNumber ??
        0
      );

      if (!selectedNumber) {
        ui.notifications.warn("Не удалось определить выбранную карточку.");
        return;
      }

      chosenCard = await KriptaApiClient.getCardMeta(selectedLevel, selectedNumber);
    } else {
      chosenCard = await KriptaApiClient.rollCard(selectedLevel);
    }

    if (!chosenCard) {
      ui.notifications.warn("Не удалось получить карточку.");
      return;
    }

    let imageUrl = "";
    try {
      const blob = await KriptaApiClient.getCardImageBlob(chosenCard.level, chosenCard.number);
      imageUrl = URL.createObjectURL(blob);
    } catch (_error) {
      imageUrl = "";
    }

    await createCardRequestMessage({
      playerGuid,
      ownerFoundryUserId,
      level: chosenCard.level,
      number: chosenCard.number,
      playerName: game.users.get(ownerFoundryUserId)?.name ?? game.user.name,
      title: mode === "manual"
        ? `Выбрана карта: ${chosenCard.name}`
        : `Случайная карта: ${chosenCard.name}`,
      levelName: chosenCard.levelName ?? "",
      imageUrl,
      description: chosenCard.description ?? "",
      speakerUser: game.user
    });

    notifyInfo("Запрос карточки отправлен в чат.");
  }
}
