import { handleConfig } from "./config/config";
import { appState, waitConfig } from "./config/state";
import { handleComment } from "./features/comments";
import { mutationsListener } from "./features/observer";
import { processStories } from "./features/stories";
import { addSettingsOpenButton, processTabs } from "./features/ui";
import { STYLES } from "./styles";
import { addCss } from "./utils/dom";
import { info } from "./utils/log";
import { sendNotification } from "./utils/notification";
import * as Gollum from "./gollum";
import * as RPM from "./rpm";
import * as SettingEnums from "./config/enums";

const supportMenuCommands: boolean = GM.registerMenuCommand !== undefined;

export function init() {
  addCss(STYLES);

  appState.observer = new MutationObserver(mutationsListener);
  appState.observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Userscript managers may inject the script after the load event has already fired,
  // and onLoad reads settings, so it has to wait for the config too.
  const runOnLoad = () => waitConfig().then(onLoad);
  if (document.readyState === "complete") {
    runOnLoad();
  } else {
    window.addEventListener("load", runOnLoad);
  }

  waitConfig().then(onConfig);

  if (window.location.pathname.startsWith("/@")) {
    onUserProfilePage();
  }
}

async function onConfig() {
  processTabs();
  if (GM_config.get("uuid")) {
    delete GM_config.fields["registerRpm"];
  } else {
    delete GM_config.fields["copyRpmToken"];
    delete GM_config.fields["resetRpmToken"];
  }
}

function unrollComments(button: HTMLButtonElement, attemptsLeft = 100) {
  if (attemptsLeft <= 0 || button.disabled) return;
  button.click();

  setTimeout(() => {
    if (document.body.contains(button)) {
      unrollComments(button, attemptsLeft - 1);
    }
  }, 500);
}

export function commentMoreBtn() {
  const value = GM_config.get("unrollCommentaries");

  if (value === SettingEnums.UnrollComments.NONE) return;

  const moreButton = document.querySelector(
    ".comment__more"
  ) as HTMLButtonElement;
  if (!moreButton) return;

  if (value === SettingEnums.UnrollComments.UNROLL_ALL_BUTTON) {
    if (moreButton.parentElement.querySelector(".rpm-unroll-all")) return;

    const btn = document.createElement("button");
    btn.textContent = "Раскрыть все комментарии";
    btn.classList.add("rpm-unroll-all");

    btn.addEventListener("click", () => {
      btn.remove();
      unrollComments(moreButton);
    });

    moreButton.parentElement.append(btn);
  } else if (value === SettingEnums.UnrollComments.AUTO_UNROLL) {
    unrollComments(moreButton);
  }
}

const DISCLAIMER = `
Пользуясь данным скриптом и его функциями, вы соглашаетесь с <a href="https://rpm.pyxiion.ru/terms">пользовательским соглашением и политикой конфиденциальности</a>.
Данное сообщение появится всего три раза.
`.trim();

function usageDisclaimer() {
  let count = parseInt(localStorage.getItem("rpm-disclaimer") ?? '3');
  if (count > 0) {
    sendNotification('Условия пользования', DISCLAIMER, 10000, true);
    localStorage.setItem('rpm-disclaimer', (count - 1).toString());
  }
}

async function onLoad() {
  usageDisclaimer();
  processStories(document.querySelectorAll("article.story"));

  // The "show more comments" button is usually already on the page at load time
  commentMoreBtn();

  if (!supportMenuCommands) addSettingsOpenButton();

  for (const comment of document.querySelectorAll<HTMLDivElement>(".comment")) {
    handleComment(comment);
  }
}

async function onUserProfilePage() {
  const nickElem = document.querySelector(".page-profile .profile__nick");
  const feedPanel = document.querySelector(".feed-panel, .user-filters");
  if (!nickElem?.textContent || !feedPanel?.parentElement) return;
  const userName = nickElem.textContent;

  let lastSection = null;

  await waitConfig();

  // Теги постов
  if (GM_config.get("profileStoryTags")) {
    const section = document.createElement("section");
    section.append(
      Gollum.createTagsContainer(
        userName,
        "Теги постов",
        Gollum.storyTagsGetter,
        true
      )
    );
    feedPanel.parentElement.insertBefore(section, feedPanel);
    lastSection = section;
  }

  // Теги комментов
  if (GM_config.get("profileСommentTags")) {
    const section = document.createElement("section");
    section.append(
      Gollum.createTagsContainer(
        userName,
        "Теги комментариев",
        Gollum.commentTagsGetter,
        true
      )
    );
    feedPanel.parentElement.insertBefore(section, feedPanel);
    lastSection = section;
  }

  // Комменты
  if (GM_config.get("profileСomments")) {
    const section = document.createElement("section");
    section.append(
      Gollum.createLastCommentsSection(
        userName,
        GM_config.get("profileAutoloadComments") as boolean,
        GM_config.get("profileAutoloadPikabuCommentCount") as number
      )
    );
    feedPanel.parentElement.insertBefore(section, feedPanel);
    lastSection = section;
  }

  // Powered
  if (lastSection !== null) {
    const poweredElem = RPM.Nodes.createPoweredNote(
      `Данные получены с <a href="https://gollum.space/user/${userName.replace(/\./g, "_")}-summary" target="_blank">gollum.space</a>`
    );
    const rpmPoweredElem = RPM.Nodes.createPoweredNote(
      "Работает с помощью Return Pikabu minus"
    );
    lastSection.append(poweredElem, rpmPoweredElem);
  }
}


handleConfig();

if (supportMenuCommands) {
  GM.registerMenuCommand("Открыть настройки", () => {
    info("Открыты настройки.");
    GM_config.open();
  });
}

init();
