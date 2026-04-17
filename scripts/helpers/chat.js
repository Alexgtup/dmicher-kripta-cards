import { CHAT_ACTIONS, MODULE_ID } from "../constants.js";
import { buildWhisperRecipients, escapeHtml, getRollModeForUser } from "./utils.js";

export function getActionPayloadFromElement(element) {
  try {
    const raw = element?.dataset?.payload;
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function createActionButtonHtml(action, decision, label, payload, cssClass = "") {
  const encodedPayload = encodeURIComponent(JSON.stringify(payload));
  return `<button type="button" class="kripta-chat-button ${cssClass}" data-kripta-action="${action}" data-kripta-decision="${decision}" data-payload="${encodedPayload}">${escapeHtml(label)}</button>`;
}

export async function createKriptaChatMessage({
  title,
  subtitle = "",
  imageUrl = "",
  description = "",
  footerHtml = "",
  speakerUser = game.user,
  buttonsHtml = "",
  whisper = null,
  flags = {}
}) {
  const speaker = ChatMessage.getSpeaker({ user: speakerUser });
  const content = `
    <div class="kripta-chat-card">
      <div class="kripta-chat-card__title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="kripta-chat-card__subtitle">${escapeHtml(subtitle)}</div>` : ""}
      ${imageUrl ? `<div class="kripta-chat-card__image-wrap"><img class="kripta-chat-card__image" src="${imageUrl}" alt="${escapeHtml(title)}"></div>` : ""}
      ${description ? `<div class="kripta-chat-card__description">${description}</div>` : ""}
      ${buttonsHtml ? `<div class="kripta-chat-card__actions">${buttonsHtml}</div>` : ""}
      ${footerHtml ? `<div class="kripta-chat-card__footer">${footerHtml}</div>` : ""}
    </div>
  `;

  const rollMode = whisper ? CONST.DICE_ROLL_MODES.PRIVATE : getRollModeForUser(speakerUser);
  const whisperRecipients = whisper ?? (rollMode === CONST.DICE_ROLL_MODES.PUBLIC ? [] : buildWhisperRecipients(speakerUser));

  return ChatMessage.create({
    user: game.user.id,
    speaker,
    whisper: whisperRecipients,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    rollMode,
    content,
    flags: {
      [MODULE_ID]: flags
    }
  });
}

export async function createCardRequestMessage({
  playerGuid,
  ownerFoundryUserId,
  level,
  number,
  playerName,
  title,
  levelName,
  imageUrl,
  description,
  speakerUser = game.user
}) {
  const payload = { playerGuid, ownerFoundryUserId, level, number };
  const buttonsHtml = [
    createActionButtonHtml(CHAT_ACTIONS.REQUEST_CARD, "confirm", "Подтвердить", payload, "is-confirm"),
    createActionButtonHtml(CHAT_ACTIONS.REQUEST_CARD, "cancel", "Отменить", payload, "is-cancel")
  ].join("");

  return createKriptaChatMessage({
    title,
    subtitle: levelName,
    imageUrl,
    description,
    speakerUser,
    buttonsHtml,
    flags: {
      type: CHAT_ACTIONS.REQUEST_CARD,
      payload,
      playerName
    }
  });
}
