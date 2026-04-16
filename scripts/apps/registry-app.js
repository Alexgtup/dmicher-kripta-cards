import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";
import { addEditPlayerDialog, deletePlayerDialog } from "./dialogs.js";
import { notifyError, notifyInfo } from "../helpers/utils.js";

export class KriptaPlayerRegistryApp extends Application {
  constructor(options = {}) {
    super(options);
    this.players = [];
    this.selectedGuid = null;
    this.onChange = options.onChange ?? (() => {});
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-registry`,
      title: "Реестр игроков",
      template: `${TEMPLATE_ROOT}/registry-app.hbs`,
      classes: [MODULE_ID, "sheet"],
      width: 760,
      height: 640,
      resizable: true
    });
  }

  async getData() {
    this.players = await KriptaApiClient.getPlayersList();
    if (!this.selectedGuid && this.players.length) this.selectedGuid = this.players[0].guid;
    return {
      players: this.players.map((player) => ({
        ...player,
        isSelected: player.guid === this.selectedGuid
      })),
      hasPlayers: this.players.length > 0
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[data-player-guid]').on("click", (event) => {
      this.selectedGuid = event.currentTarget.dataset.playerGuid;
      this.render();
    });

    html.find('[data-action="refresh"]').on("click", () => this.render());

    html.find('[data-action="add"]').on("click", async () => {
      const payload = await addEditPlayerDialog();
      if (!payload?.name) return;
      try {
        await KriptaApiClient.addPlayer(payload.name, payload.comment);
        notifyInfo("Игрок добавлен.");
        this.onChange();
        this.render();
      } catch (error) {
        notifyError(error, "Не удалось добавить игрока");
      }
    });

    html.find('[data-action="edit"]').on("click", async () => {
      const player = this.players.find((item) => item.guid === this.selectedGuid);
      if (!player) return;
      const payload = await addEditPlayerDialog(player);
      if (!payload?.name) return;
      try {
        await KriptaApiClient.updatePlayer(player.guid, payload.name, payload.comment);
        notifyInfo("Игрок обновлен.");
        this.onChange();
        this.render();
      } catch (error) {
        notifyError(error, "Не удалось обновить игрока");
      }
    });

    html.find('[data-action="delete"]').on("click", async () => {
      const player = this.players.find((item) => item.guid === this.selectedGuid);
      if (!player) return;
      const confirmed = await deletePlayerDialog(player);
      if (!confirmed) return;
      try {
        await KriptaApiClient.deletePlayer(player.guid);
        notifyInfo("Игрок удален.");
        if (this.selectedGuid === player.guid) this.selectedGuid = null;
        this.onChange();
        this.render();
      } catch (error) {
        notifyError(error, "Не удалось удалить игрока");
      }
    });
  }
}
