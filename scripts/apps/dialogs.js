import { escapeHtml } from "../helpers/utils.js";

const { DialogV2 } = foundry.applications.api;

async function waitDialog(config, fallback = null) {
  try {
    return await DialogV2.wait({
      rejectClose: false,
      modal: true,
      ...config
    });
  } catch (_error) {
    return fallback;
  }
}

export async function chooseServerPlayerDialog(players) {
  const options = players.map((player) => `
    <option value="${escapeHtml(player.guid)}">${escapeHtml(player.name)}${player.comment ? ` - ${escapeHtml(player.comment)}` : ""}</option>
  `).join("");

  return waitDialog({
    window: {
      title: "Привязать игрока сервера"
    },
    content: `
      <form class="kripta-inline-form">
        <div class="form-group">
          <label>Игрок сервера</label>
          <select name="guid">${options}</select>
        </div>
      </form>
    `,
    buttons: [
      {
        action: "confirm",
        label: "Привязать",
        default: true,
        callback: (_event, button) => button.form?.elements?.guid?.value || null
      },
      {
        action: "cancel",
        label: "Отмена",
        callback: () => null
      }
    ]
  }, null);
}

export async function addEditPlayerDialog(player = null) {
  return waitDialog({
    window: {
      title: player ? "Изменить игрока" : "Добавить игрока"
    },
    content: `
      <form class="kripta-inline-form">
        <div class="form-group">
          <label>Имя</label>
          <input type="text" name="name" value="${escapeHtml(player?.name ?? "")}">
        </div>
        <div class="form-group">
          <label>Комментарий</label>
          <input type="text" name="comment" value="${escapeHtml(player?.comment ?? "")}">
        </div>
      </form>
    `,
    buttons: [
      {
        action: "confirm",
        label: player ? "Изменить" : "Добавить",
        default: true,
        callback: (_event, button) => ({
          name: String(button.form?.elements?.name?.value ?? "").trim(),
          comment: String(button.form?.elements?.comment?.value ?? "").trim()
        })
      },
      {
        action: "cancel",
        label: "Отмена",
        callback: () => null
      }
    ]
  }, null);
}

export async function deletePlayerDialog(player) {
  const code = String(Math.floor(Math.random() * 100));

  return waitDialog({
    window: {
      title: "Удалить игрока"
    },
    content: `
      <div class="kripta-danger-note">
        удаление игрока "${escapeHtml(player?.name ?? "")}" необратимо. введите ${escapeHtml(code)} и подтвердите удаление.
      </div>
      <form class="kripta-inline-form">
        <div class="form-group">
          <label>Код подтверждения</label>
          <input type="text" name="code" value="">
        </div>
      </form>
    `,
    buttons: [
      {
        action: "confirm",
        label: "Удалить",
        default: true,
        callback: (_event, button) => String(button.form?.elements?.code?.value ?? "") === code
      },
      {
        action: "cancel",
        label: "Отмена",
        callback: () => false
      }
    ]
  }, false);
}

export async function countPromptDialog({ title, message, max = 1, defaultValue = 1 }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeDefault = Math.max(1, Math.min(safeMax, Number(defaultValue) || 1));

  return waitDialog({
    window: {
      title
    },
    content: `
      <div class="kripta-danger-note">${message}</div>
      <form class="kripta-inline-form">
        <div class="form-group">
          <label>Количество</label>
          <input type="number" name="count" min="1" max="${safeMax}" value="${safeDefault}">
        </div>
        <div class="notes">всего карточек этого типа - ${safeMax}</div>
      </form>
    `,
    buttons: [
      {
        action: "confirm",
        label: "Подтвердить",
        default: true,
        callback: (_event, button) => {
          const rawValue = Number(button.form?.elements?.count?.value || 1);
          return Math.max(1, Math.min(safeMax, rawValue));
        }
      },
      {
        action: "cancel",
        label: "Отмена",
        callback: () => null
      }
    ]
  }, null);
}

export async function chooseBoundUserDialog(users) {
  const options = ['<option value="">-- не выбран --</option>'].concat(
    users.map((item) => `
      <option value="${escapeHtml(item.foundryUserId)}">${escapeHtml(item.foundryUserName)}</option>
    `)
  ).join("");

  return waitDialog({
    window: {
      title: "Выдать карточку"
    },
    content: `
      <form class="kripta-inline-form">
        <div class="form-group">
          <label>Игрок</label>
          <select name="foundryUserId">${options}</select>
        </div>
      </form>
    `,
    buttons: [
      {
        action: "confirm",
        label: "Выдать",
        default: true,
        callback: (_event, button) => String(button.form?.elements?.foundryUserId?.value || "")
      },
      {
        action: "cancel",
        label: "Отмена",
        callback: () => ""
      }
    ]
  }, "");
}
