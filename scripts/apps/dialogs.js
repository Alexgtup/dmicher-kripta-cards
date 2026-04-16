import { escapeHtml } from "../helpers/utils.js";

export async function chooseServerPlayerDialog(players) {
  return new Promise((resolve) => {
    const options = players.map((player) => `
      <option value="${escapeHtml(player.guid)}">${escapeHtml(player.name)}${player.comment ? ` - ${escapeHtml(player.comment)}` : ""}</option>
    `).join("");

    new Dialog({
      title: "Привязать игрока сервера",
      content: `
        <form class="kripta-inline-form">
          <div class="form-group">
            <label>Игрок сервера</label>
            <select name="guid">${options}</select>
          </div>
        </form>
      `,
      buttons: {
        confirm: {
          label: "Привязать",
          callback: (html) => resolve(html.find('[name="guid"]').val() || null)
        },
        cancel: {
          label: "Отмена",
          callback: () => resolve(null)
        }
      },
      default: "confirm",
      close: () => resolve(null)
    }).render(true);
  });
}

export async function addEditPlayerDialog(player = null) {
  return new Promise((resolve) => {
    new Dialog({
      title: player ? "Изменить игрока" : "Добавить игрока",
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
      buttons: {
        confirm: {
          label: player ? "Изменить" : "Добавить",
          callback: (html) => resolve({
            name: String(html.find('[name="name"]').val() ?? "").trim(),
            comment: String(html.find('[name="comment"]').val() ?? "").trim()
          })
        },
        cancel: {
          label: "Отмена",
          callback: () => resolve(null)
        }
      },
      default: "confirm",
      close: () => resolve(null)
    }).render(true);
  });
}

export async function deletePlayerDialog(player) {
  return new Promise((resolve) => {
    const code = String(Math.floor(Math.random() * 100));
    new Dialog({
      title: "Удалить игрока",
      content: `
        <div class="kripta-danger-note">Удаление игрока необратимо. Введите ${code} и подтвердите удаление.</div>
        <form class="kripta-inline-form">
          <div class="form-group">
            <label>Код подтверждения</label>
            <input type="text" name="code" value="">
          </div>
        </form>
      `,
      buttons: {
        confirm: {
          label: "Удалить",
          callback: (html) => resolve(String(html.find('[name="code"]').val() ?? "") === code)
        },
        cancel: {
          label: "Отмена",
          callback: () => resolve(false)
        }
      },
      default: "cancel",
      close: () => resolve(false)
    }).render(true);
  });
}

export async function countPromptDialog({ title, message, max = 1, defaultValue = 1 }) {
  return new Promise((resolve) => {
    new Dialog({
      title,
      content: `
        <div class="kripta-danger-note">${message}</div>
        <form class="kripta-inline-form">
          <div class="form-group">
            <label>Количество</label>
            <input type="number" name="count" min="1" max="${Number(max) || 1}" value="${Number(defaultValue) || 1}">
          </div>
          <div class="notes">Всего карточек этого типа - ${Number(max) || 1}</div>
        </form>
      `,
      buttons: {
        confirm: {
          label: "Подтвердить",
          callback: (html) => resolve(Math.max(1, Math.min(Number(max) || 1, Number(html.find('[name="count"]').val() || 1))))
        },
        cancel: {
          label: "Отмена",
          callback: () => resolve(null)
        }
      },
      default: "confirm",
      close: () => resolve(null)
    }).render(true);
  });
}

export async function chooseBoundUserDialog(users) {
  return new Promise((resolve) => {
    const options = ['<option value="">-- не выбран --</option>'].concat(users.map((item) => `
      <option value="${escapeHtml(item.foundryUserId)}">${escapeHtml(item.foundryUserName)}</option>
    `)).join("");

    new Dialog({
      title: "Выдать карточку",
      content: `
        <form class="kripta-inline-form">
          <div class="form-group">
            <label>Игрок</label>
            <select name="foundryUserId">${options}</select>
          </div>
        </form>
      `,
      buttons: {
        confirm: {
          label: "Выдать",
          callback: (html) => resolve(String(html.find('[name="foundryUserId"]').val() || ""))
        },
        cancel: {
          label: "Отмена",
          callback: () => resolve("")
        }
      },
      default: "confirm",
      close: () => resolve("")
    }).render(true);
  });
}
