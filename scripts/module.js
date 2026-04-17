import { KriptaApiClient } from "./api/client.js";
import { MODULE_ID, CHAT_ACTIONS } from "./constants.js";
import { createKriptaChatMessage, getActionPayloadFromElement } from "./helpers/chat.js";
import { getBinding, notifyError, notifyInfo, notifyWarn } from "./helpers/utils.js";
import { KriptaCatalogApp } from "./apps/catalog-app.js";
import { KriptaMyCardsApp } from "./apps/my-cards-app.js";
import { KriptaPlayersApp } from "./apps/players-app.js";
import { KriptaRequestCardDialog } from "./apps/request-card-dialog.js";
import { registerSettings } from "./settings.js";

Hooks.once("init", () => {
  registerSettings();
  Handlebars.registerHelper("eq", (a, b) => a === b);
  console.log(`${MODULE_ID} | initialized`);
});

Hooks.once("ready", () => {
  game.modules.get(MODULE_ID).api = { KriptaApiClient };
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tools = {
    catalog: {
      name: "catalog",
      title: "Каталог карточек",
      icon: "fas fa-book-open",
      order: 0,
      button: true,
      visible: true,
      onClick: () => new KriptaCatalogApp().render(true)
    },
    "get-card": {
      name: "get-card",
      title: "Получить карточку",
      icon: "fas fa-hand-holding-medical",
      order: 1,
      button: true,
      visible: true,
      onClick: () => {
        const binding = getBinding(game.user.id);
        if (!binding?.guid) return notifyWarn(game.i18n.localize("KRIPTA.NoBinding"));
        new KriptaRequestCardDialog({
          playerGuid: binding.guid,
          ownerFoundryUserId: game.user.id
        }).render(true);
      }
    },
    "my-cards": {
      name: "my-cards",
      title: "Мои карточки",
      icon: "fas fa-images",
      order: 2,
      button: true,
      visible: true,
      onClick: () => {
        const binding = getBinding(game.user.id);
        if (!binding?.guid) return notifyWarn(game.i18n.localize("KRIPTA.NoBinding"));
        new KriptaMyCardsApp({
          playerGuid: binding.guid,
          playerName: game.user.name,
          ownerFoundryUserId: game.user.id
        }).render(true);
      }
    },
    players: {
      name: "players",
      title: "Управление игроками",
      icon: "fas fa-users-cog",
      order: 3,
      button: true,
      visible: game.user.isGM,
      onClick: () => new KriptaPlayersApp().render(true)
    }
  };

  controls[MODULE_ID] = {
    name: MODULE_ID,
    title: "Карточки крипты",
    icon: "fas fa-id-card",
    order: 90,
    activeTool: "catalog",
    visible: true,
    tools
  };
});

Hooks.on("renderChatMessage", (message, html) => {
  html.find('[data-kripta-action]').each((_index, element) => {
    const $element = $(element);
    if (!game.user.isGM) $element.hide();
  });

  html.find('[data-kripta-action]').on("click", async (event) => {
    event.preventDefault();
    if (!game.user.isGM) return notifyWarn(game.i18n.localize("KRIPTA.GMOnly"));

    const action = event.currentTarget.dataset.kriptaAction;
    if (action !== CHAT_ACTIONS.REQUEST_CARD) return;

    const payload = getActionPayloadFromElement(event.currentTarget);
    const decision = event.currentTarget.dataset.kriptaDecision;
    if (!payload) return notifyWarn("Не удалось прочитать данные запроса.");

    if (decision === "cancel") {
      await message.delete();
      notifyInfo("Запрос карточки отменен.");
      return;
    }

    try {
      const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

      const bindings = game.settings.get("dmicher-kripta-cards", "playerBindings") ?? {};

      const resolvedPlayerGuid =
        payload.playerGuid && payload.playerGuid !== ZERO_GUID
          ? payload.playerGuid
          : (
              bindings?.[payload.ownerFoundryUserId]?.guid ??
              bindings?.[payload.ownerFoundryUserId]?.playerGuid ??
              ZERO_GUID
            );

      if (!resolvedPlayerGuid || resolvedPlayerGuid === ZERO_GUID) {
        throw new Error("Не удалось определить playerGuid для выдачи карточки.");
      }

      await KriptaApiClient.giveCard(
        resolvedPlayerGuid,
        payload.level,
        payload.number,
        1
      );
      await message.delete();

      const [meta, levels, blob] = await Promise.all([
        KriptaApiClient.getCardMeta(payload.level, payload.number),
        KriptaApiClient.getLevelsList(),
        KriptaApiClient.getCardImageBlob(payload.level, payload.number).catch(() => null)
      ]);
      const imageUrl = blob ? URL.createObjectURL(blob) : "";
      const ownerUser = game.users.get(payload.ownerFoundryUserId);
      const levelName = levels.find((item) => item.id === payload.level)?.name ?? String(payload.level);

      await createKriptaChatMessage({
        title: `Игрок ${ownerUser?.name ?? "Игрок"} получает карточку ${meta.name} (${levelName})`,
        imageUrl,
        description: meta.description,
        speakerUser: game.user
      });

      notifyInfo("Карточка выдана.");
    } catch (error) {
      notifyError(error, "Не удалось подтвердить выдачу карточки");
    }
  });
});
