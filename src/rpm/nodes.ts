import { createElementWithClass } from "../utils/dom";

import { notifyError } from "../utils/notification";
import * as Service from "./service";
import * as UserRating from "./user-rating";

/**
 * Creates and returns a loading icon element with a specific class.
 * @returns {HTMLDivElement} The loading icon element.
 */
export function createLoadingIcon() {
  return createElementWithClass("div", "rpm-loading");
}

/**
 * Creates a note element with the provided text and specific styling.
 * @param {string} text - The text to display inside the note.
 * @returns {HTMLSpanElement} The styled note element.
 */
export function createPoweredNote(text: string) {
  const elem = createElementWithClass("span", "rpm-powered");
  elem.innerHTML = text;
  return elem;
}

/**
 * Creates a user rating node for a specific user.
 * @param {number} uid - The user ID.
 * @param {Function} infoConsumer - Optional callback to process user info.
 * @returns {HTMLDivElement} The user rating node element.
 */
export function createUserRatingNode(
  uid: number,
  url: string,
  infoConsumer: (info: RpmJson.UserInfo) => void = null
) {
  const elem = createElementWithClass(
    "div",
    "rpm-user-rating",
    "hint",
    `rpm-user-rating-${uid}`
  ) as HTMLDivElement;
  elem.setAttribute("aria-label", "Рейтинг автора в RPM");
  elem.setAttribute("pikabu-user-id", uid.toString());

  const loadingIcon = createLoadingIcon();
  elem.appendChild(loadingIcon);

  const plusElem = addSpan(elem, "rpm-pluses");
  addSpan(elem, "rpm-rating");
  const minusElem = addSpan(elem, "rpm-minuses");

  const openReasonsElem = addSpan(elem, 'rpm-more-votes');
  openReasonsElem.innerHTML = UserRating.OPEN_REASONS_ICON;
  openReasonsElem.addEventListener('click', () => {
    UserRating.showReasonsDialog(uid);
  })

  attachVoteListeners(plusElem, minusElem, elem, uid, url);

  UserRating.updateUserRatingElemAsync(elem, infoConsumer);

  return elem;
}

export function createUserVoteReasonContainer(text: string) {
  const reasonElem = createElementWithClass(
    "div",
    "rpm-vote-reason-container"
  ) as HTMLDivElement;

  const reasonTitleElem = createElementWithClass(
    "h4",
    "rpm-vote-reason-title"
  ) as HTMLParagraphElement;
  reasonTitleElem.textContent = "Заметка RPM";

  const reasonTextElem = createElementWithClass(
    "p",
    "rpm-vote-reason"
  ) as HTMLParagraphElement;
  reasonTextElem.textContent = text;

  reasonElem.append(reasonTitleElem, reasonTextElem);
  return reasonElem;
}

/**
 * Adds a span element with a specific class to a parent element.
 * @param {HTMLElement} parent - The parent element to which the span is added.
 * @param {string} cls - The class name for the span element.
 * @returns {HTMLSpanElement} The created span element.
 */
function addSpan(parent: HTMLElement, cls: string) {
  const span = createElementWithClass("span", cls);
  span.innerText = "0";
  span.style.display = "none";
  parent.appendChild(span);
  return span;
}

/**
 * Attaches voting listeners to the plus and minus elements.
 * @param {HTMLElement} plusElem - The element for upvoting.
 * @param {HTMLElement} minusElem - The element for downvoting.
 * @param {HTMLDivElement} elem - The parent rating element.
 * @param {number} uid - The user ID.
 */
function attachVoteListeners(
  plusElem: HTMLElement,
  minusElem: HTMLElement,
  elem: HTMLDivElement,
  uid: number,
  url: string
) {
  const handleVote = (vote: number) =>
    UserRating.voteCallback(elem, uid, vote, url);

  if (Service.isAuthorized()) {
    plusElem.addEventListener("click", () => handleVote(1));
    minusElem.addEventListener("click", () => handleVote(-1));
  } else {
    const msgCallback = () =>
      notifyError("Авторизируйтесь в системе RPM в настройках скрипта, чтобы голосовать за авторов."
      );
    plusElem.addEventListener("click", msgCallback);
    minusElem.addEventListener("click", msgCallback);
  }
}
