import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";
import { KriptaGiveCardDialog } from "./give-card-dialog.js";
import { KriptaRequestCardDialog } from "./request-card-dialog.js";
import { createKriptaChatMessage } from "../helpers/chat.js";
import { chooseBoundUserDialog } from "./dialogs.js";
import { getBinding, getBindings, notifyError, notifyWarn } from "../helpers/utils.js";

export class KriptaCardDetailsApp extends Application {
  constructor(options = {}) {
    super(options);
    this.level = Number(options.level);
    this.number = Number(options.number);
    this.meta = null;
    this.levels = [];
    this.imageUrl = "";
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-card-details-${foundry.utils.randomID()}`,
      title: "Карточка каталога",
      template: `${TEMPLATE_ROOT}/card-details-app.hbs`,
      classes: [MODULE_ID, "sheet"],
      width: 640,
      height: 720,
      resizable: true
    });
  }

  async getData() {
    const [meta, levels, imageBlob] = await Promise.all([
      KriptaApiClient.getCardMeta(this.level, this.number),
      KriptaApiClient.getLevelsList(),
      KriptaApiClient.getCardImageBlob(this.level, this.number).catch(() => null)
    ]);
    this.meta = meta;
    this.levels = levels;
    this.imageUrl = imageBlob ? URL.createObjectURL(imageBlob) : "";
    return {
      meta,
      levelName: levels.find((item) => item.id === this.level)?.name ?? String(this.level),
      imageUrl: this.imageUrl,
      isGM: game.user.isGM
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[data-action="output"]').on("click", async () => {
      try {
        await createKriptaChatMessage({
          title: "Справка",
          subtitle: `${this.meta?.name ?? ""} (${this.levels.find((item) => item.id === this.level)?.name ?? this.level})`,
          imageUrl: this.imageUrl,
          description: this.meta?.description ?? "",
          speakerUser: game.user
        });
      } catch (error) {
        notifyError(error, "Не удалось вывести карточку в чат");
      }
    });

    html.find('[data-action="request"]').on("click", () => {
      const binding = getBinding(game.user.id);
      if (!binding?.guid) return notifyWarn(game.i18n.localize("KRIPTA.NoBinding"));
      new KriptaRequestCardDialog({
        playerGuid: binding.guid,
        ownerFoundryUserId: game.user.id,
        initialLevel: this.level,
        initialNumber: this.number
      }).render(true);
    });

    html.find('[data-action="give"]').on("click", async () => {
      const bindings = getBindings();
      const rows = Object.entries(bindings).map(([foundryUserId, binding]) => ({
        foundryUserId,
        foundryUserName: game.users.get(foundryUserId)?.name ?? binding.name ?? foundryUserId,
        guid: binding.guid
      })).filter((item) => item.guid);

      const foundryUserId = await chooseBoundUserDialog(rows);
      if (!foundryUserId) return notifyWarn("Игрок для выдачи не выбран");
      const binding = bindings[foundryUserId];
      const playerName = game.users.get(foundryUserId)?.name ?? binding?.name ?? "";
      new KriptaGiveCardDialog({
        playerGuid: binding.guid,
        ownerFoundryUserId: foundryUserId,
        playerName,
        initialLevel: this.level,
        initialNumber: this.number
      }).render(true);
    });
  }
}
