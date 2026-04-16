import { KriptaApiClient } from "../api/client.js";
import { KriptaGiveCardDialog } from "./give-card-dialog.js";
import { KriptaMyCardsApp } from "./my-cards-app.js";
import { KriptaPlayerRegistryApp } from "./registry-app.js";
import { chooseServerPlayerDialog } from "./dialogs.js";
import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";
import { clearBinding, getBinding, getFoundryUsersForBinding, notifyError, notifyInfo, setBinding } from "../helpers/utils.js";

export class KriptaPlayersApp extends Application {
  constructor(options = {}) {
    super(options);
    this.serverPlayers = [];
    this.rows = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-players`,
      title: "Управление игроками",
      template: `${TEMPLATE_ROOT}/players-app.hbs`,
      classes: [MODULE_ID, "sheet"],
      width: 820,
      height: 640,
      resizable: true
    });
  }

  async getData() {
    const foundryUsers = getFoundryUsersForBinding();
    this.serverPlayers = await KriptaApiClient.getPlayersList();
    this.rows = foundryUsers.map((user) => {
      const binding = getBinding(user.id);
      const boundPlayer = binding ? this.serverPlayers.find((item) => item.guid === binding.guid) : null;
      return {
        foundryUserId: user.id,
        foundryUserName: user.name,
        isGM: user.isGM,
        active: user.active,
        binding,
        boundPlayer,
        cardsCount: boundPlayer?.cardsCount ?? 0
      };
    });
    return {
      rows: this.rows
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[data-action="bind"]').on("click", async (event) => {
      const foundryUserId = event.currentTarget.dataset.userId;
      const chosenGuid = await chooseServerPlayerDialog(this.serverPlayers);
      if (!chosenGuid) return;
      const player = this.serverPlayers.find((item) => item.guid === chosenGuid);
      if (!player) return;
      await setBinding(foundryUserId, player);
      notifyInfo("Привязка сохранена.");
      this.render();
    });

    html.find('[data-action="unbind"]').on("click", async (event) => {
      const foundryUserId = event.currentTarget.dataset.userId;
      await clearBinding(foundryUserId);
      notifyInfo("Привязка удалена.");
      this.render();
    });

    html.find('[data-action="open-cards"]').on("click", (event) => {
      const foundryUserId = event.currentTarget.dataset.userId;
      const row = this.rows.find((item) => item.foundryUserId === foundryUserId);
      if (!row?.binding?.guid) return ui.notifications.warn(game.i18n.localize("KRIPTA.NoBinding"));
      new KriptaMyCardsApp({
        playerGuid: row.binding.guid,
        playerName: row.foundryUserName,
        ownerFoundryUserId: foundryUserId
      }).render(true);
    });

    html.find('[data-action="give-card"]').on("click", (event) => {
      const foundryUserId = event.currentTarget.dataset.userId;
      const row = this.rows.find((item) => item.foundryUserId === foundryUserId);
      if (!row?.binding?.guid) return ui.notifications.warn(game.i18n.localize("KRIPTA.NoBinding"));
      new KriptaGiveCardDialog({
        playerGuid: row.binding.guid,
        ownerFoundryUserId: foundryUserId,
        playerName: row.foundryUserName,
        onComplete: () => this.render()
      }).render(true);
    });

    html.find('[data-action="refresh"]').on("click", () => this.render());
    html.find('[data-action="registry"]').on("click", () => new KriptaPlayerRegistryApp({ onChange: () => this.render() }).render(true));
  }
}
