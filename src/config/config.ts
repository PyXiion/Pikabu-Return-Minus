import { appState, formats, makeEval } from "./state";

import { sleep } from "../utils/dom";
import { sendNotification, notifySuccess } from "../utils/notification";
import * as RPM from "../rpm";
import * as SettingEnums from "./enums";
import { createSections, FieldDef } from "./schema";
import { enhanceSettingsUI } from "./ui";

const frame = document.createElement("div");
document.body.appendChild(frame);

async function handleOldConfigFields() {
  let config: any;
  try {
    const stored = await GM.getValue("prm", "{}");
    config = typeof stored === "string" ? JSON.parse(stored) : stored;
  } catch {
    // Corrupted settings must not stop the script from starting
    return;
  }
  if (!config || typeof config !== "object") return;

  let changed = false;

  if ("unrollCommentariesAutomatically" in config) {
    if (config.unrollCommentariesAutomatically) {
      config.unrollCommentaries = SettingEnums.UnrollComments.AUTO_UNROLL;
    }
    delete config.unrollCommentariesAutomatically;
    changed = true;
  }

  if (changed) await GM.setValue("prm", JSON.stringify(config));
}

async function registerInRpm() {
  const uuid = GM_config.get("uuid");
  if (uuid === null || uuid === undefined || uuid === "") {
    GM_config.set("uuid", await RPM.Service.register());
    GM_config.save();
    notifySuccess("Вы успешно зарегистрировались. Или нет. Проверки успешности не существует."
    );

    await sleep(300);
    window.location.reload();
  } else {
    sendNotification(
      "Вы уже зарегистрированы",
      "Вы не можете зарегистрироваться ещё раз."
    );
  }
}

function createTitle() {
  const title = document.createElement("div");
  title.classList.add("rpm-title");

  const name = document.createElement("h1");
  name.textContent = "Return Pikabu minus";

  const links = document.createElement("div");
  links.classList.add("rpm-links");

  const addLink = (text: string, url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = text;
    links.append(link);
  };

  addLink("Телеграм", "https://t.me/return_pikabu");
  addLink("GitHub", "https://github.com/PyXiion/Pikabu-Return-Minus");
  addLink("Условия использования", "https://rpm.pyxiion.ru/terms");

  title.append(name, links);
  return title;
}

function toGmField(def: FieldDef, firstOfSection: { title: string; desc?: string } | null) {
  const field: Record<string, any> = { type: def.type };

  if (firstOfSection) {
    field.section = firstOfSection.desc
      ? [firstOfSection.title, firstOfSection.desc]
      : [firstOfSection.title];
  }
  if (def.type === "hidden") {
    field.default = def.default;
    return field;
  }

  // GM_config uses `label` as the button caption for buttons
  field.label = def.type === "button" ? def.action : def.title;

  if (def.type === "button") {
    field.click = def.click;
  } else {
    field.default = def.default;
    if (def.type === "select") field.options = def.options;
  }
  return field;
}

/** Values derived from settings; recomputed on init and after every save. */
function applyDerivedSettings(config: GM_configStruct) {
  formats.formatStoryMinuses = makeEval(
    "story",
    config.get("minusesPattern") as string,
    (x: any) => x.minuses
  );
  formats.formatCommentMinuses = makeEval(
    "comment",
    config.get("minusesCommentPattern") as string,
    (x: any) => x.minuses
  );
  formats.formatOwnComment = makeEval(
    "comment",
    config.get("ownCommentPattern") as string,
    (x: any) =>
      x.pluses == 0 && x.minuses == 0 ? 0 : `${x.pluses}/${x.minuses}`
  );

  try {
    appState.enableFilters = new RegExp(
      config.get("filteringPageRegex") as string
    ).test(window.location.href);
  } catch {
    appState.enableFilters = false;
  }
}

export async function handleConfig() {
  await handleOldConfigFields();

  const sections = createSections(registerInRpm);

  const fields: Record<string, any> = {};
  sections.forEach((section) => {
    section.fields.forEach((def, i) => {
      fields[def.key] = toGmField(def, i === 0 ? section : null);
    });
  });

  GM_config.init({
    id: "prm",
    title: createTitle(),
    fields,
    frame,
    frameStyle: "display: none; position: fixed; z-index: 100000;",
    events: {
      init() {
        appState.isConfigInit = true;

        applyDerivedSettings(this);

        this.css.basic = [];

        if (this.get("unrollCommentariesAutomatically")) {
          this.set(
            "unrollCommentaries",
            SettingEnums.UnrollComments.AUTO_UNROLL
          );
          this.set("unrollCommentariesAutomatically", null);
          this.save();
        }
      },
      open(_document, _window, openedFrame) {
        enhanceSettingsUI(openedFrame, this, sections);
      },
      save() {
        applyDerivedSettings(this);
        sendNotification(
          "Настройки сохранены",
          "Часть изменений применится после перезагрузки страницы.",
          3000,
          false,
          "success"
        );
      },
    },
  });
}
