import { KriptaApiClient } from "../api/client.js";
import { MODULE_ID, TEMPLATE_ROOT } from "../constants.js";
import { getServerUrl, getTechUsers, notifyError, notifyInfo, setServerUrl, setTechUsers } from "../helpers/utils.js";

export class KriptaSettingsApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-settings`,
      title: "Карточки Крипты - настройки",
      template: `${TEMPLATE_ROOT}/settings-app.hbs`,
      classes: [MODULE_ID, "sheet"],
      width: 620,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false
    });
  }

  async getData() {
    const users = getTechUsers();
    return {
      serverUrl: getServerUrl(),
      writerId: users.writer?.id ?? "",
      writerKey: users.writer?.key ?? "",
      readerId: users.reader?.id ?? "",
      readerKey: users.reader?.key ?? ""
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="test-server"]').on("click", async (event) => {
      event.preventDefault();
      await this._persistFromHtml(html);
      try {
        const result = await KriptaApiClient.healthCheck();
        notifyInfo(typeof result === "string" ? result : "Сервер доступен.");
      } catch (error) {
        notifyError(error, "Проверка сервера не удалась");
      }
    });

    html.find('[data-action="test-auth"]').on("click", async (event) => {
      event.preventDefault();
      await this._persistFromHtml(html);
      try {
        await KriptaApiClient.checkMe();
        await KriptaApiClient.testWriterAccess();
        notifyInfo("Reader и Writer успешно проходят проверку.");
      } catch (error) {
        notifyError(error, "Проверка тех.пользователей не удалась");
      }
    });
  }

  async _persistFromHtml(html) {
    const payload = {
      serverUrl: html.find('[name="serverUrl"]').val(),
      writer: {
        id: html.find('[name="writerId"]').val(),
        key: html.find('[name="writerKey"]').val()
      },
      reader: {
        id: html.find('[name="readerId"]').val(),
        key: html.find('[name="readerKey"]').val()
      }
    };
    await setServerUrl(payload.serverUrl);
    await setTechUsers({ writer: payload.writer, reader: payload.reader });
  }

  async _updateObject(_event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    await setServerUrl(expanded.serverUrl);
    await setTechUsers({
      writer: { id: expanded.writerId ?? "", key: expanded.writerKey ?? "" },
      reader: { id: expanded.readerId ?? "", key: expanded.readerKey ?? "" }
    });
    notifyInfo("Настройки подключения сохранены.");
  }
}
