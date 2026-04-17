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

    const selectedLevel = Number(
      data.level ??
      data.category ??
      this.level ??
      this.selectedLevel ??
      0
    );

    const mode = String(
      data.mode ??
      data.requestMode ??
      "random"
    );

    let playerGuid =
      this.options.playerGuid ??
      this.playerGuid ??
      "00000000-0000-0000-0000-000000000000";

    const ownerFoundryUserId =
      this.options.ownerFoundryUserId ??
      this.ownerFoundryUserId ??
      game.user.id;

    if (!playerGuid || playerGuid === "00000000-0000-0000-0000-000000000000") {
      const bindings = game.settings.get("dmicher-kripta-cards", "playerBindings") ?? {};
      playerGuid =
        bindings?.[ownerFoundryUserId]?.guid ??
        bindings?.[ownerFoundryUserId]?.playerGuid ??
        "00000000-0000-0000-0000-000000000000";
    }

    let chosenCard = null;

    if (mode === "choice") {
      const selectedCardValue = String(
        data.card ??
        data.number ??
        data.selectedCard ??
        ""
      ).trim();

      const cards = await KriptaApiClient.getCardsList(selectedLevel, "");

      chosenCard =
        cards.find((c) => String(c.number) === selectedCardValue) ||
        cards.find((c) => c.name === selectedCardValue) ||
        cards.find((c) => `${c.level}:${c.number}` === selectedCardValue) ||
        null;

      if (!chosenCard) {
        return ui.notifications.warn("Не удалось определить выбранную карточку.");
      }
    } else {
      chosenCard = await KriptaApiClient.rollCard(selectedLevel);
    }

    if (!chosenCard) {
      return ui.notifications.warn("Не удалось получить карточку.");
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
      title: mode === "choice"
        ? `Выбрана карта: ${chosenCard.name}`
        : `Случайная карта: ${chosenCard.name}`,
      levelName: chosenCard.levelName ?? "",
      imageUrl,
      description: chosenCard.description ?? "",
      speakerUser: game.user
    });

    ui.notifications.info("Запрос карточки отправлен в чат.");
  }
}
