import { appState } from "../config/state";
import { error } from "../utils/log";
import { notifyError, notifySuccess } from "../utils/notification";
import * as Gollum from "../gollum";
import * as RPM from "../rpm";
import * as SettingEnums from "../config/enums";

async function requestCsrfToken() {
  if (appState.csrfToken !== null) return appState.csrfToken;

  const configElem = document.querySelector(".app__config");
  if (!configElem?.textContent) throw new Error("Pikabu config with the CSRF token was not found");
  appState.csrfToken = JSON.parse(configElem.textContent).csrfToken;
  return appState.csrfToken;
}

const newNotes = new Map<number, string>();

const NOTE_PLACEHOLDER =
  "Заметка об этом пользователе будет видна только вам. Нажмите, чтобы ввести текст.";

export function handleMiniProfile(element: HTMLDivElement) {
  if (element.hasAttribute("rpm-affected")) return;

  element.setAttribute("rpm-affected", "");

  const nameElem = element.querySelector(".pkb-profile-username h2");
  if (!nameElem?.textContent) return;
  const userId = parseInt(element.getAttribute("data-user-id"));
  const userName = nameElem.textContent.trim();

  if (GM_config.get('miniProfileOrientation') === SettingEnums.MiniProfileFeaturesOrientation.HORIZONTAL) {
    element.classList.add('rpm-mini-profile-horizontal');
  }

  function updateNoteElement() {
    let note = newNotes.get(userId);
    let noteHtml: string;

    const pkbNoteElem = element.querySelector(".mini-profile__note");
    if (pkbNoteElem) {
      if (note === undefined || note === null) {
        note = pkbNoteElem.textContent;
        noteHtml = pkbNoteElem.innerHTML;

        for (const link of pkbNoteElem.querySelectorAll("a")) {
          note = note.replace(link.textContent, link.href);
        }
      }
      pkbNoteElem.remove();
    }

    const noteElem = document.createElement("div");
    noteElem.classList.add("input__box", "mini-profile__note");

    const textareaElem = document.createElement("textarea");
    textareaElem.classList.add(
      "input__input",
      "profile-note__textarea",
      "rpm-mini-profile-note"
    );
    textareaElem.setAttribute("rows", "1");
    textareaElem.setAttribute(
      "placeholder",
      "Заметка об этом пользователе будет видна только вам. Нажмите, чтобы ввести текст."
    );
    textareaElem.value = note ?? "";

    const noteDisplayElem = document.createElement("cite");
    noteDisplayElem.classList.add("rpm-mini-profile-note-display");

    const showNoteText = (text: string, html?: string) => {
      noteDisplayElem.classList.toggle("rpm-note-empty", !text);
      if (html) {
        noteDisplayElem.innerHTML = html;
      } else {
        noteDisplayElem.textContent = text || NOTE_PLACEHOLDER;
      }
    };
    showNoteText(note ?? "", noteHtml);

    noteElem.append(textareaElem, noteDisplayElem);

    const mainElem = element.querySelector(".mini-profile__main");
    if (!mainElem) return;
    mainElem.append(noteElem);

    const rpmPoweredElem = RPM.Nodes.createPoweredNote(
      "Улучшено с помощью Return Pikabu minus"
    );
    mainElem.append(rpmPoweredElem);

    function setTextareaActive(active: boolean) {
      if (active) {
        textareaElem.style.display = "";
        noteDisplayElem.style.display = "none";
      } else {
        textareaElem.style.display = "none";
        noteDisplayElem.style.display = "";
      }
    }

    setTextareaActive(note === "");

    let saved = true;
    async function save() {
      const noteToSave = note ?? "";
      saved = true;
      newNotes.set(userId, noteToSave);

      const action = noteToSave !== "" ? "note+" : "note-";
      try {
        const response = await fetch("/ajax/users_actions.php", {
          method: "POST",
          headers: {
            "X-Csrf-Token": await requestCsrfToken(),
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Priority: "u=0",
          },
          body: `id=${userId}&action=${encodeURIComponent(
            action
          )}&message=${encodeURIComponent(noteToSave)}`,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        notifySuccess("Заметка сохранена");
      } catch (e) {
        saved = false;
        error(e);
        notifyError("Не удалось сохранить заметку. Попробуйте ещё раз.");
      }
    }

    let timeout = null;

    textareaElem.addEventListener("input", () => {
      saved = false;
      note = textareaElem.value;
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(save, 1500);
    });
    const onUnfocus = () => {
      setTextareaActive(false);
      showNoteText(textareaElem.value);
      if (timeout !== null && !saved) {
        clearTimeout(timeout);
        timeout = null;
        save();
      }
    };
    textareaElem.addEventListener("blur", onUnfocus);

    noteDisplayElem.addEventListener("click", () => {
      setTextareaActive(true);
      textareaElem.focus();
    });
  }

  function gollumIntegration() {
    const main = document.createElement("div");
    main.classList.add("rpm-gollum-stats");

    let worked = false;
    if (GM_config.get("miniProfileStoryTags")) {
      const storyTagsElem = Gollum.createTagsContainer(
        userName,
        "Теги постов",
        Gollum.storyTagsGetter,
        GM_config.get("miniProfileAutoloadTags") as boolean
      );
      main.append(storyTagsElem);
      worked = true;
    }
    if (GM_config.get("miniProfileСommentTags")) {
      const commentsTagsElem = Gollum.createTagsContainer(
        userName,
        "Теги комментариев",
        Gollum.commentTagsGetter,
        GM_config.get("miniProfileAutoloadTags") as boolean
      );
      main.append(commentsTagsElem);
      worked = true;
    }
    if (GM_config.get("miniProfileСomments")) {
      const lastComments = Gollum.createLastCommentsSection(
        userName,
        GM_config.get("miniProfileAutoloadComments") as boolean,
        GM_config.get("miniProfileAutoloadPikabuCommentCount") as number,
        true
      );
      main.append(lastComments);
      worked = true;
    }

    if (worked) {
      const poweredElem = RPM.Nodes.createPoweredNote(
        `Данные получены с <a href="https://gollum.space/user/${userName.replace(/\./g, "_")}-summary" target="_blank">gollum.space</a>`
      );
      main.append(poweredElem);
    }

    element.append(main);
  }

  if (GM_config.get("miniProfileEditableNote")) {
    updateNoteElement();
  }
  gollumIntegration();
}
