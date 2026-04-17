import { KriptaApiClient } from "./api/client.js";
import { MODULE_ID, CHAT_ACTIONS } from "./constants.js";
import { createKriptaChatMessage, getActionPayloadFromElement } from "./helpers/chat.js";
import { getBinding, notifyError, notifyInfo, notifyWarn } from "./helpers/utils.js";
import { KriptaCatalogApp } from "./apps/catalog-app.js";
import { KriptaMyCardsApp } from "./apps/my-cards-app.js";
import { KriptaPlayersApp } from "./apps/players-app.js";
import { KriptaRequestCardDialog } from "./apps/request-card-dialog.js";
import { registerSettings } from "./settings.js";

const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

function normalizeGuidCandidate(value) {
  if (!value) return "";
  const stringValue = String(value).trim();
  if (!stringValue || stringValue === ZERO_GUID) return "";
  return stringValue;
}

function getPlayerGuidFromBinding(foundryUserId) {
  const binding = getBinding(foundryUserId);
  return (
    normalizeGuidCandidate(binding?.guid) ||
    normalizeGuidCandidate(binding?.playerGuid) ||
    normalizeGuidCandidate(binding?.id) ||
    ""
  );
}

async function resolvePlayerGuid(payload) {
  const explicitGuid =
    normalizeGuidCandidate(payload?.playerGuid) ||
    normalizeGuidCandidate(payload?.guid) ||
    normalizeGuidCandidate(payload?.id);

  if (explicitGuid) return explicitGuid;

  const bindingGuid = getPlayerGuidFromBinding(payload?.ownerFoundryUserId);
  if (bindingGuid) return bindingGuid;

  const ownerUser = game.users.get(payload?.ownerFoundryUserId);
  const ownerName = String(payload?.playerName ?? ownerUser?.name ?? "").trim().toLowerCase();

  if (!ownerName) return "";

  const players = await KriptaApiClient.getPlayersList();
  const matched = players.find((player) => {
    const playerName = String(player?.name ?? "").trim().toLowerCase();
    return playerName === ownerName;
  });

  return (
    normalizeGuidCandidate(matched?.guid) ||
    normalizeGuidCandidate(matched?.playerGuid) ||
    normalizeGuidCandidate(matched?.id) ||
    ""
  );
}

Hooks.once("init", () => {
  registerSettings();
  Handlebars.registerHelper("eq", (a, b) => a === b);
  console.log(`${MODULE_ID} | initialized`);
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { KriptaApiClient };
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
      onChange: () => {
        new KriptaCatalogApp().render(true);
      }
    },
    "get-card": {
      name: "get-card",
      title: "Получить карточку",
      icon: "fas fa-hand-holding-medical",
      order: 1,
      button: true,
      visible: true,
      onChange: () => {
        const binding = getBinding(game.user.id);
        const playerGuid = binding?.guid ?? binding?.playerGuid ?? "";

        if (!playerGuid) {
          notifyWarn(game.i18n.localize("KRIPTA.NoBinding"));
          return;
        }

        new KriptaRequestCardDialog({
          playerGuid,
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
      onChange: () => {
        const binding = getBinding(game.user.id);
        const playerGuid = binding?.guid ?? binding?.playerGuid ?? "";

        if (!playerGuid) {
          notifyWarn(game.i18n.localize("KRIPTA.NoBinding"));
          return;
        }

        new KriptaMyCardsApp({
          playerGuid,
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
      onChange: () => {
        new KriptaPlayersApp().render(true);
      }
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

Hooks.on("renderChatMessageHTML", (message, html) => {
  const actionButtons = html.querySelectorAll("[data-kripta-action]");

  for (const element of actionButtons) {
    if (!game.user.isGM) {
      element.style.display = "none";
    }

    element.addEventListener("click", async (event) => {
      event.preventDefault();

      if (!game.user.isGM) {
        notifyWarn(game.i18n.localize("KRIPTA.GMOnly"));
        return;
      }

      const target = event.currentTarget;
      const action = target.dataset.kriptaAction;
      if (action !== CHAT_ACTIONS.REQUEST_CARD) return;

      const payload = getActionPayloadFromElement(target);
      const decision = target.dataset.kriptaDecision;

      if (!payload) {
        notifyWarn("Не удалось прочитать данные запроса.");
        return;
      }

      if (decision === "cancel") {
        await message.delete();
        notifyInfo("Запрос карточки отменен.");
        return;
      }

      try {
        const resolvedPlayerGuid = await resolvePlayerGuid(payload);

        if (!resolvedPlayerGuid) {
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
          title: `игрок ${ownerUser?.name ?? payload.playerName ?? "игрок"} получает карточку ${meta.name} (${levelName})`,
          imageUrl,
          description: meta.description,
          speakerUser: game.user
        });

        notifyInfo("Карточка выдана.");
      } catch (error) {
        notifyError(error, "Не удалось подтвердить выдачу карточки");
      }
    });
  }
});
