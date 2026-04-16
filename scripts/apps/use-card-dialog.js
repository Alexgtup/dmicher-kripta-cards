import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";
import { createKriptaChatMessage } from "../helpers/chat.js";
import { notifyError, notifyInfo } from "../helpers/utils.js";

export class KriptaUseCardDialog extends FormApplication {
  constructor(options = {}) {
    super(options);
    this.playerGuid = options.playerGuid;
    this.playerName = options.playerName ?? game.user.name;
    this.ownerFoundryUserId = options.ownerFoundryUserId ?? game.user.id;
    this.level = Number(options.level);
    this.number = Number(options.number);
    this.onComplete = options.onComplete ?? (() => {});
    this.meta = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-use-card`,
      title: "Использовать карточку",
      template: `${TEMPLATE_ROOT}/use-card-dialog.hbs`,
      classes: [MODULE_ID, "sheet"],
      width: 480,
      height: "auto",
      closeOnSubmit: true
    });
  }

  async getData() {
    this.meta = await KriptaApiClient.getCardMeta(this.level, this.number);
    return {
      meta: this.meta
    };
  }

  async _updateObject(_event, formData) {
    const data = foundry.utils.expandObject(formData);
    const spend = data.mode !== "show";
    try {
      const blob = await KriptaApiClient.getCardImageBlob(this.level, this.number).catch(() => null);
      const imageUrl = blob ? URL.createObjectURL(blob) : "";
      if (spend) await KriptaApiClient.takeCard(this.playerGuid, this.level, this.number, 1);

      await createKriptaChatMessage({
        title: this.meta?.name ?? `Карточка ${this.level}/${this.number}`,
        imageUrl,
        description: this.meta?.description ?? "",
        footerHtml: spend ? '<div class="kripta-spent-note">карточка потрачена</div>' : "",
        speakerUser: game.users.get(this.ownerFoundryUserId) ?? game.user
      });

      if (spend) notifyInfo("Карточка использована и списана.");
      this.onComplete();
    } catch (error) {
      notifyError(error, "Не удалось использовать карточку");
    }
  }
}
