import { createElementWithClass } from "../utils/dom";
import { error } from "../utils/log";
import { notifyError } from "../utils/notification";
import * as Dialog from "./dialog";
import * as Service from "./service";

export const OPEN_REASONS_ICON = `<svg width="800px" height="800px" viewBox="0 0 48 48" id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;}</style></defs><path class="cls-1" d="M10.35,4.5a2,2,0,0,0-1.95,2v35.1a2,2,0,0,0,1.95,2h27.3a2,2,0,0,0,2-2V14.49h-8a2,2,0,0,1-1.95-2v-8Z"/><line class="cls-1" x1="29.61" y1="4.5" x2="39.6" y2="14.49"/><line class="cls-1" x1="15.84" y1="22.97" x2="32.16" y2="22.97"/><line class="cls-1" x1="15.84" y1="35.07" x2="32.16" y2="35.07"/><line class="cls-1" x1="15.84" y1="29.02" x2="32.16" y2="29.02"/></svg>`;
const userCache: Map<number, RpmJson.UserInfo> = new Map();

/**
 * Updates the user rating element with the provided user info.
 * @param {HTMLDivElement} elem - The user rating element.
 * @param {RpmJson.UserInfo} info - The user info to update the element with.
 */
function updateUserRatingElem(
  elem: HTMLDivElement,
  info: RpmJson.UserInfo
) {
  elem.querySelector(".rpm-loading")?.remove();
  if (!info) return;

  const { pluses, minuses, base_rating, own_vote } = info;
  const adjustedPluses = pluses + (own_vote === 1 ? 1 : 0);
  const adjustedMinuses = minuses + (own_vote === -1 ? 1 : 0);
  const rating = adjustedPluses - adjustedMinuses + base_rating;

  if (own_vote !== undefined && own_vote !== null) {
    elem.setAttribute("rpm-own-vote", own_vote.toString());
  }

  updateSpan(elem, ".rpm-pluses", adjustedPluses);
  updateSpan(elem, ".rpm-rating", rating);
  updateSpan(elem, ".rpm-minuses", adjustedMinuses);
  const moreVotes = elem.querySelector<HTMLSpanElement>(".rpm-more-votes");
  if (moreVotes) moreVotes.style.display = "";
}

/**
 * Updates a specific span within a parent element with a given value.
 * @param {HTMLElement} parent - The parent element.
 * @param {string} selector - The CSS selector for the span.
 * @param {number} value - The value to set in the span.
 */
function updateSpan(
  parent: HTMLElement,
  selector: string,
  value: number
) {
  const elem = parent.querySelector<HTMLSpanElement>(selector);
  if (!elem) return;
  elem.style.display = "";
  elem.innerText = value.toString();
}

/**
 * Asynchronously updates the user rating element with user info.
 * @param {HTMLDivElement} elem - The user rating element.
 * @param {Function} infoConsumer - Optional callback to process user info.
 */
export async function updateUserRatingElemAsync(
  elem: HTMLDivElement,
  infoConsumer: (info: RpmJson.UserInfo) => void = null
) {
  const uid = parseInt(elem.getAttribute("pikabu-user-id"));
  if (isNaN(uid)) {
    elem.querySelector(".rpm-loading")?.remove();
    return;
  }

  try {
    const info = userCache.get(uid) ?? (await Service.getUserInfo(uid));
    userCache.set(uid, info);

    infoConsumer?.(info);
    updateUserRatingElem(elem, info);
  } catch (e) {
    // RPM is unavailable: there is nothing to show, so don't leave an empty badge behind
    error(e);
    elem.remove();
  }
}

/**
 * Handles user vote actions.
 * @param {HTMLDivElement} elem - The user rating element.
 * @param {number} uid - The user ID.
 * @param {number} btn - The vote direction (1 for upvote, -1 for downvote).
 */
export async function voteCallback(
  elem: HTMLDivElement,
  uid: number,
  btn: number,
  url: string
) {
  if (!Service.isAuthorized()) {
    notifyError("Чтобы проголосовать за автора, нужно зарегистрироваться в системе RPM. Вы можете сделать это в настройках."
    );
    return;
  }

  const ownVote = parseInt(elem.getAttribute("rpm-own-vote") ?? "0");
  const vote = ownVote === btn ? 0 : ownVote + btn;

  try {
    if (vote === -1) {
      await showVoteDialog(uid, -1, url);
    } else {
      await voteUser(uid, vote, null, null, url);
    }
  } catch (e) {
    // The user has already been notified by the service layer
    error(e);
  }
}

/**
 * Sends a vote for a user and updates the cache and UI.
 * @param {number} uid - The user ID.
 * @param {number} vote - The vote value.
 */
async function voteUser(
  uid: number,
  vote: number,
  reasonId: number = null,
  reasonText: string = null,
  url: string = null
) {
  await Service.voteUser(uid, vote, reasonId, reasonText, url);

  const info = userCache.get(uid) || (await Service.getUserInfo(uid));
  info.own_vote = vote;
  userCache.set(uid, info);
  updateAll(uid, info);
}

/**
 * Updates all elements associated with a specific user.
 * @param {number} uid - The user ID.
 * @param {RpmJson.UserInfo} info - The user info.
 */
function updateAll(uid: number, info: RpmJson.UserInfo) {
  getAllElementsOfUser(uid).forEach((elem) =>
    updateUserRatingElem(elem, info)
  );
}

/**
 * Retrieves all rating elements associated with a specific user ID.
 * @param {number} uid - The user ID.
 * @returns {NodeListOf<HTMLDivElement>} A list of matching elements.
 */
function getAllElementsOfUser(uid: number) {
  if (!Number.isInteger(uid)) return [] as unknown as NodeListOf<HTMLDivElement>;
  return document.querySelectorAll(
    `.rpm-user-rating-${uid}`
  ) as NodeListOf<HTMLDivElement>;
}

/**
 * Creates and shows a reason selection dialog.
 * @param {number} uid - The user ID.
 * @param {number} vote - The vote value (-1).
 */
export async function showVoteDialog(uid, vote, url: string) {
  let reasons: RpmJson.Reason[];
  try {
    reasons = await Service.getReasons();
  } catch (e) {
    error(e);
    notifyError("Не удалось загрузить список причин.");
    return;
  }

  const bodyContent = createElementWithClass("div", "rpm-reason-list");

  const createOption = (id: string, text: string) => {
    const option = createElementWithClass("div", "rpm-reason-option");

    const radio = createElementWithClass("input");
    radio.type = "radio";
    radio.name = "reason";
    radio.value = id;
    radio.id = `rpm-reason-${id}`;

    const label = createElementWithClass("label");
    label.htmlFor = radio.id;
    label.append(radio, text);

    option.append(label);
    bodyContent.append(option);
    return { option, radio };
  };

  reasons.forEach((reason) => createOption(reason.id.toString(), reason.text));

  const { option: otherOption, radio: otherRadio } = createOption("other", "Другое");

  const otherInput = createElementWithClass("input", "rpm-reason-input");
  otherInput.type = "text";
  otherInput.maxLength = 200;
  otherInput.placeholder = "Опишите причину";
  otherOption.append(otherInput);

  // Typing a custom reason selects "Другое"; Enter submits
  otherInput.addEventListener("input", () => {
    otherRadio.checked = true;
  });
  otherInput.addEventListener("focus", () => {
    otherRadio.checked = true;
  });
  otherInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      overlay.querySelector<HTMLButtonElement>(".rpm-btn-primary")?.click();
    }
  });

  const overlay = Dialog.createModalDialog(
    "Причина минуса",
    bodyContent,
    [
      {
        label: "Отмена",
        className: "rpm-btn",
        onClick: () => overlay.remove(),
      },
      {
        label: "Отправить",
        className: "rpm-btn rpm-btn-primary",
        onClick: async () => {
          const submitBtn = overlay.querySelector<HTMLButtonElement>(
            ".rpm-btn-primary"
          );
          const selectedReason = bodyContent.querySelector<HTMLInputElement>(
            'input[name="reason"]:checked'
          );

          if (!selectedReason) {
            notifyError("Выберите причину или введите свою.");
            return;
          }

          const reasonId =
            selectedReason.value === "other"
              ? null
              : parseInt(selectedReason.value);
          const reasonText = otherInput.value.trim();

          if (reasonId === null && reasonText.length === 0) {
            notifyError("Напишите причину.");
            otherInput.focus();
            return;
          }

          submitBtn.disabled = true;
          submitBtn.innerText = "Отправка...";
          try {
            await voteUser(uid, vote, reasonId, reasonText, url);
            overlay.remove();
          } catch (e) {
            // the service layer already told the user what went wrong
            error(e);
            submitBtn.disabled = false;
            submitBtn.innerText = "Отправить";
          }
        },
      },
    ]
  );
}

/** Vote timestamps are unix seconds; tolerate milliseconds too. */
function formatVoteDate(timestamp: number) {
  if (!timestamp) return "";
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Shows a dialog listing reasons for votes.
 * @param {number} uid - The user ID.
 */
export async function showReasonsDialog(uid: number) {
  let votes: RpmJson.VotesInfo[];
  try {
    votes = await Service.getUserVotes(uid);
  } catch (e) {
    error(e);
    notifyError("Не удалось загрузить причины голосов.");
    return;
  }

  const content = createElementWithClass("div", "rpm-votes-list");

  if (votes.length === 0) {
    content.append(
      Object.assign(createElementWithClass("div", "rpm-votes-message"), {
        textContent: "Голосов пока нет.",
      })
    );
  } else {
    votes.forEach((vote) => {
      const isPlus = vote.vote > 0;
      const entry = createElementWithClass(
        "div",
        "rpm-vote-entry",
        isPlus ? "rpm-vote-plus" : "rpm-vote-minus"
      );

      const sign = createElementWithClass("div", "rpm-vote-sign");
      sign.textContent = isPlus ? "+" : "\u2212";
      sign.title = isPlus ? "Плюс" : "Минус";

      const main = createElementWithClass("div", "rpm-vote-main");

      const head = createElementWithClass("div", "rpm-vote-head");
      const name = createElementWithClass("span", "rpm-user");
      name.textContent = vote.name;
      head.append(name);

      const date = formatVoteDate(vote.timestamp);
      if (date) {
        const time = createElementWithClass("span", "rpm-vote-time");
        time.textContent = date;
        head.append(time);
      }
      main.append(head);

      if (vote.text) {
        const text = createElementWithClass("div", "rpm-vote-text");
        text.textContent = vote.text;
        main.append(text);
      }

      if (vote.url && /^https?:\/\//i.test(vote.url)) {
        const link = createElementWithClass("a", "rpm-vote-link");
        link.textContent = "Открыть пост или комментарий";
        link.href = vote.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        main.append(link);
      }

      entry.append(sign, main);
      content.append(entry);
    });
  }

  Dialog.createModalDialog(
    "Причины голосов",
    content,
    [
      {
        label: "Закрыть",
        className: "rpm-btn rpm-btn-primary",
        onClick: (overlay) => overlay.remove(),
      },
    ],
  );
}
