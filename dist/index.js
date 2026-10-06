// ==UserScript==
// @name         Return Pikabu minus
// @version      0.16
// @namespace    pikabu-return-minus.pyxiion.ru
// @description  Возвращает минусы на Pikabu, а также фильтрацию по рейтингу.
// @author       PyXiion
// @match        *://pikabu.ru/*
// @connect      api.pikabu.ru
// @connect      pikabu.ru
// @connect      rpm.pyxiion.ru
// @connect      gollum.space
// @connect      isla-de-muerta.com
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @license      MIT
// @updateURL    https://github.com/PyXiion/Pikabu-Return-Minus/raw/main/dist/index.js
// @downloadURL  https://github.com/PyXiion/Pikabu-Return-Minus/raw/main/dist/index.js
// ==/UserScript==
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/config/state.ts
  function makeEval(args, str, defaultFunc) {
    try {
      return new Function(args, "return " + str);
    } catch {
      return defaultFunc;
    }
  }
  var Formats = class {
  };
  var formats = new Formats();
  var waitConfig = () => new Promise((resolve) => {
    let isInit = () => setTimeout(() => appState.isConfigInit ? resolve() : isInit(), 1);
    isInit();
  });
  var appState = {
    enableFilters: null,
    isConfigInit: false,
    csrfToken: null,
    observer: null
  };

  // src/utils/log.ts
  var logPrefix = "[RPM]";
  function info(...args) {
    if (GM_config === void 0 || GM_config.get === void 0) return;
    if (GM_config.get("debug")) {
      console.info(logPrefix, ...args);
    }
  }
  function warn(...args) {
    if (GM_config === void 0 || GM_config.get === void 0) return;
    if (GM_config.get("debug")) {
      console.warn(logPrefix, ...args);
    }
  }
  function error(...args) {
    if (GM_config === void 0 || GM_config.get === void 0) return;
    if (GM_config.get("debug")) {
      console.error(logPrefix, ...args);
    }
  }

  // src/utils/dom.ts
  function createElementWithClass(tagName, ...classes) {
    const elem = document.createElement(tagName);
    elem.classList.add(...classes);
    return elem;
  }
  function waitForElement(selector, timeout = 5e3, parent = null) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      parent = parent ?? document;
      const checkExistence = () => {
        const element = parent.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime >= timeout) {
          reject(
            new Error(
              `Element with selector "${selector}" not found within ${timeout}ms`
            )
          );
        } else {
          setTimeout(checkExistence, 50);
        }
      };
      checkExistence();
    });
  }
  function addCss(css) {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = css;
    document.body.appendChild(styleSheet);
    info("Добавлен CSS");
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // src/utils/notification.ts
  var LEAVE_ANIMATION_MS = 250;
  function getContainer() {
    let container = document.querySelector(".rpm-toasts");
    if (!container) {
      container = document.createElement("div");
      container.classList.add("rpm-toasts");
      container.setAttribute("rpm-observer-ignore", "");
      document.body.append(container);
    }
    return container;
  }
  function sendNotification(title, description, timeout = 2e3, html = false, kind = "info") {
    const toast = document.createElement("div");
    toast.classList.add("rpm-toast", `rpm-toast-${kind}`);
    toast.setAttribute("role", kind === "error" ? "alert" : "status");
    const titleElem = document.createElement("div");
    titleElem.classList.add("rpm-toast-title");
    titleElem.textContent = title;
    const body = document.createElement("div");
    body.classList.add("rpm-toast-body");
    if (html) {
      body.innerHTML = description;
    } else {
      body.textContent = description;
    }
    const close = document.createElement("button");
    close.type = "button";
    close.classList.add("rpm-toast-close");
    close.setAttribute("aria-label", "Закрыть");
    close.textContent = "×";
    toast.append(titleElem, body, close);
    getContainer().append(toast);
    let timer;
    const dismiss = () => {
      clearTimeout(timer);
      if (toast.classList.contains("rpm-leaving")) return;
      toast.classList.add("rpm-leaving");
      setTimeout(() => toast.remove(), LEAVE_ANIMATION_MS);
    };
    toast.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      dismiss();
    });
    const schedule = () => {
      timer = window.setTimeout(dismiss, timeout);
    };
    toast.addEventListener("mouseenter", () => clearTimeout(timer));
    toast.addEventListener("mouseleave", schedule);
    schedule();
  }
  function notifyError(description) {
    sendNotification("Ошибка", description, 4e3, false, "error");
  }
  function notifySuccess(description) {
    sendNotification("Успешно", description, 2500, false, "success");
  }

  // src/rpm/service.ts
  var service_exports = {};
  __export(service_exports, {
    get: () => get,
    getFeedbacks: () => getFeedbacks,
    getReasons: () => getReasons,
    getUserInfo: () => getUserInfo,
    getUserVotes: () => getUserVotes,
    isAuthorized: () => isAuthorized,
    post: () => post,
    register: () => register,
    voteUser: () => voteUser
  });

  // src/net/http.ts
  var AbstractHttpRequest = class {
    constructor(url, responseType, additionalParameters = null) {
      this.url = url;
      this.httpMethod = "POST";
      this.headers = /* @__PURE__ */ new Map();
      this.timeout = 15e3;
      this.responseType = responseType;
      this.additionalParameters = {
        anonymous: true,
        fetch: true,
        ...additionalParameters
      };
    }
    addHeader(key, value) {
      this.headers.set(key, value);
      return this;
    }
    setHttpMethod(httpMethod) {
      this.httpMethod = httpMethod;
      return this;
    }
    execute(callback) {
      const data = this.getData();
      const details = {
        url: this.url,
        method: this.httpMethod,
        headers: Object.fromEntries(this.headers),
        data: data ? JSON.stringify(data) : null,
        timeout: this.timeout,
        responseType: this.responseType,
        onerror: callback.onError,
        onload: callback.onSuccess,
        // TODO: ontimeout
        onabort: callback.onError,
        ontimeout: callback.onError,
        ...this.additionalParameters
      };
      GM.xmlHttpRequest(details);
    }
    executeAsync() {
      const promise = new Promise((resolve, reject) => {
        this.execute({
          onError: reject,
          onSuccess: resolve
        });
      });
      promise.catch(error);
      return promise;
    }
  };
  var HttpRequest = class extends AbstractHttpRequest {
    constructor(url, method = "GET", responseType, additionalParameters = null) {
      super(url, responseType, additionalParameters);
      this.httpMethod = method;
    }
    setBody(body) {
      this.body = body;
    }
    getData() {
      return this.body;
    }
  };

  // src/rpm/service.ts
  var DOMAIN = "https://rpm.pyxiion.ru/";
  var USER_REQUEST_QUEUE_PERIOD = 300;
  var PERIOD_MULTIPLIER = 1;
  var USER_REQUEST_QUEUE_AT_ONCE = 25;
  function isAuthorized() {
    return GM_config.get("uuid") !== "";
  }
  async function register() {
    const response = await post(
      DOMAIN + "register",
      {}
    );
    return response.secret;
  }
  async function getFeedbacks() {
    const response = await get(
      DOMAIN + "meta/feedback"
    );
    return response;
  }
  var userInfoRequestQueue = /* @__PURE__ */ new Map();
  var userInfoRetries = /* @__PURE__ */ new Map();
  var USER_INFO_MAX_RETRIES = 3;
  var MAX_PERIOD_MULTIPLIER = 16;
  var isQueueRunning = false;
  var unavailableUntil = 0;
  var UNAVAILABLE_COOLDOWN_MS = 6e4;
  function getUserInfo(id) {
    if (Date.now() < unavailableUntil) {
      return Promise.reject(new Error("RPM is temporarily unavailable"));
    }
    return new Promise((resolve, reject) => {
      const req = { resolve, reject };
      const pending = userInfoRequestQueue.get(id);
      if (pending) pending.push(req);
      else userInfoRequestQueue.set(id, [req]);
      workQueue(USER_REQUEST_QUEUE_PERIOD * PERIOD_MULTIPLIER);
    });
  }
  async function getBunchOfUserRatings(ids) {
    const body = {
      ids
    };
    const uuid = GM_config.get("uuid");
    if (uuid) body.user_uuid = uuid;
    const response = await post(
      DOMAIN + "v2/users/ratings",
      body,
      { silent: true }
    );
    const users = response?.users ?? {};
    for (const id in users) {
      postprocessUserInfo(users[id]);
    }
    return users;
  }
  async function workQueue(sleepTime = 0) {
    if (userInfoRequestQueue.size === 0 || isQueueRunning) return;
    isQueueRunning = true;
    await sleep(sleepTime);
    const ids = Array.from(userInfoRequestQueue.keys()).slice(
      0,
      USER_REQUEST_QUEUE_AT_ONCE
    );
    try {
      const usersInfo = await getBunchOfUserRatings(ids);
      ids.forEach((id) => {
        const userRequests = userInfoRequestQueue.get(id);
        userInfoRequestQueue.delete(id);
        userInfoRetries.delete(id);
        const info2 = usersInfo[id] ?? { pluses: 0, minuses: 0, base_rating: 0 };
        userRequests?.forEach((req) => req.resolve(info2));
      });
      PERIOD_MULTIPLIER = 1;
      unavailableUntil = 0;
    } catch (e) {
      error("Error processing user info requests:", e);
      PERIOD_MULTIPLIER = Math.min(PERIOD_MULTIPLIER * 2, MAX_PERIOD_MULTIPLIER);
      ids.forEach((id) => {
        const retries = (userInfoRetries.get(id) ?? 0) + 1;
        if (retries >= USER_INFO_MAX_RETRIES) {
          unavailableUntil = Date.now() + UNAVAILABLE_COOLDOWN_MS;
          const userRequests = userInfoRequestQueue.get(id);
          userInfoRequestQueue.delete(id);
          userInfoRetries.delete(id);
          userRequests?.forEach((req) => req.reject(e));
        } else {
          userInfoRetries.set(id, retries);
        }
      });
    } finally {
      isQueueRunning = false;
    }
    if (userInfoRequestQueue.size > 0) {
      setTimeout(() => workQueue(), USER_REQUEST_QUEUE_PERIOD * PERIOD_MULTIPLIER);
    }
  }
  function postprocessUserInfo(info2) {
    if (info2.own_vote) {
      info2.pluses -= info2.own_vote === 1 ? 1 : 0;
      info2.minuses -= info2.own_vote === -1 ? 1 : 0;
    }
  }
  function voteUser(id, vote, reasonId = null, reasonText = null, url = null) {
    if (!isAuthorized()) return null;
    const data = {
      user_uuid: GM_config.get("uuid"),
      vote
    };
    if (reasonId !== null) {
      data["reason_id"] = reasonId;
    }
    if (reasonText !== null) {
      data["reason_text"] = reasonText;
    }
    if (url !== null) {
      data["reason_url"] = url;
    }
    return post(DOMAIN + `user/${id}/vote`, data);
  }
  function isOk(status) {
    return status >= 200 && status < 300;
  }
  function handleBody(body) {
    if (body && typeof body === "object") {
      if ("message" in body) {
        sendNotification("Сообщение", body.message);
      }
      if (body.result === "error") {
        throw Error(body.message ?? "Unknown error");
      }
    }
  }
  async function send(request, silent) {
    let response;
    try {
      response = await request.executeAsync();
    } catch (e) {
      if (!silent) {
        notifyError("Не удалось связаться с сервером RPM. Возможно, он сейчас недоступен.");
      }
      throw e;
    }
    if (!isOk(response.status)) {
      if (!silent) notifyError(response.statusText);
      throw Error(response.statusText);
    }
    handleBody(response.response);
    return response.response;
  }
  async function post(url, json, options = {}) {
    const request = new HttpRequest(url, "POST", "json");
    request.addHeader("Content-Type", "application/json");
    request.setBody(json);
    return send(request, !!options.silent);
  }
  async function get(url, options = {}) {
    return send(new HttpRequest(url, "GET", "json"), !!options.silent);
  }
  var reasonsCache = null;
  async function getReasons() {
    if (reasonsCache !== null) return reasonsCache;
    const body = await get(DOMAIN + "meta/vote_reasons");
    reasonsCache = Array.isArray(body?.reasons) ? body.reasons : [];
    return reasonsCache;
  }
  async function getUserVotes(uid) {
    const body = await post(DOMAIN + `v2/user/${uid}/votes`, {
      user_uuid: GM_config.get("uuid")
    });
    return Array.isArray(body?.reasons) ? body.reasons : [];
  }

  // src/rpm/nodes.ts
  var nodes_exports = {};
  __export(nodes_exports, {
    createLoadingIcon: () => createLoadingIcon,
    createPoweredNote: () => createPoweredNote,
    createUserRatingNode: () => createUserRatingNode,
    createUserVoteReasonContainer: () => createUserVoteReasonContainer
  });

  // src/rpm/dialog.ts
  function createModalDialog(title, bodyContent, buttons) {
    document.querySelectorAll(".rpm-modal-overlay").forEach((e) => e.remove());
    const overlay = createElementWithClass("div", "rpm-modal-overlay");
    overlay.tabIndex = -1;
    const modal = createElementWithClass("div", "rpm-modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", title);
    const header = createElementWithClass("div", "rpm-modal-header");
    const heading = createElementWithClass("span");
    heading.textContent = title;
    const closeButton = createElementWithClass("button", "rpm-modal-close");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Закрыть");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => overlay.remove());
    header.append(heading, closeButton);
    const body = createElementWithClass("div", "rpm-modal-body");
    body.appendChild(bodyContent);
    const footer = createElementWithClass("div", "rpm-modal-footer");
    buttons.forEach(({ label, className, onClick }) => {
      const button = createElementWithClass("button", ...className.split(" "));
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => onClick(overlay));
      footer.appendChild(button);
    });
    modal.append(header, body, footer);
    overlay.appendChild(modal);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") overlay.remove();
    });
    document.body.appendChild(overlay);
    (bodyContent.querySelector("input") ?? overlay).focus();
    return overlay;
  }

  // src/rpm/user-rating.ts
  var OPEN_REASONS_ICON = `<svg width="800px" height="800px" viewBox="0 0 48 48" id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;}</style></defs><path class="cls-1" d="M10.35,4.5a2,2,0,0,0-1.95,2v35.1a2,2,0,0,0,1.95,2h27.3a2,2,0,0,0,2-2V14.49h-8a2,2,0,0,1-1.95-2v-8Z"/><line class="cls-1" x1="29.61" y1="4.5" x2="39.6" y2="14.49"/><line class="cls-1" x1="15.84" y1="22.97" x2="32.16" y2="22.97"/><line class="cls-1" x1="15.84" y1="35.07" x2="32.16" y2="35.07"/><line class="cls-1" x1="15.84" y1="29.02" x2="32.16" y2="29.02"/></svg>`;
  var userCache = /* @__PURE__ */ new Map();
  function updateUserRatingElem(elem, info2) {
    elem.querySelector(".rpm-loading")?.remove();
    if (!info2) return;
    const { pluses, minuses, base_rating, own_vote } = info2;
    const adjustedPluses = pluses + (own_vote === 1 ? 1 : 0);
    const adjustedMinuses = minuses + (own_vote === -1 ? 1 : 0);
    const rating = adjustedPluses - adjustedMinuses + base_rating;
    if (own_vote !== void 0 && own_vote !== null) {
      elem.setAttribute("rpm-own-vote", own_vote.toString());
    }
    updateSpan(elem, ".rpm-pluses", adjustedPluses);
    updateSpan(elem, ".rpm-rating", rating);
    updateSpan(elem, ".rpm-minuses", adjustedMinuses);
    const moreVotes = elem.querySelector(".rpm-more-votes");
    if (moreVotes) moreVotes.style.display = "";
  }
  function updateSpan(parent, selector, value) {
    const elem = parent.querySelector(selector);
    if (!elem) return;
    elem.style.display = "";
    elem.innerText = value.toString();
  }
  async function updateUserRatingElemAsync(elem, infoConsumer = null) {
    const uid = parseInt(elem.getAttribute("pikabu-user-id"));
    if (isNaN(uid)) {
      elem.querySelector(".rpm-loading")?.remove();
      return;
    }
    try {
      const info2 = userCache.get(uid) ?? await getUserInfo(uid);
      userCache.set(uid, info2);
      infoConsumer?.(info2);
      updateUserRatingElem(elem, info2);
    } catch (e) {
      error(e);
      elem.remove();
    }
  }
  async function voteCallback(elem, uid, btn, url) {
    if (!isAuthorized()) {
      notifyError(
        "Чтобы проголосовать за автора, нужно зарегистрироваться в системе RPM. Вы можете сделать это в настройках."
      );
      return;
    }
    const ownVote = parseInt(elem.getAttribute("rpm-own-vote") ?? "0");
    const vote = ownVote === btn ? 0 : ownVote + btn;
    try {
      if (vote === -1) {
        await showVoteDialog(uid, -1, url);
      } else {
        await voteUser2(uid, vote, null, null, url);
      }
    } catch (e) {
      error(e);
    }
  }
  async function voteUser2(uid, vote, reasonId = null, reasonText = null, url = null) {
    await voteUser(uid, vote, reasonId, reasonText, url);
    const info2 = userCache.get(uid) || await getUserInfo(uid);
    info2.own_vote = vote;
    userCache.set(uid, info2);
    updateAll(uid, info2);
  }
  function updateAll(uid, info2) {
    getAllElementsOfUser(uid).forEach(
      (elem) => updateUserRatingElem(elem, info2)
    );
  }
  function getAllElementsOfUser(uid) {
    if (!Number.isInteger(uid)) return [];
    return document.querySelectorAll(
      `.rpm-user-rating-${uid}`
    );
  }
  async function showVoteDialog(uid, vote, url) {
    let reasons;
    try {
      reasons = await getReasons();
    } catch (e) {
      error(e);
      notifyError("Не удалось загрузить список причин.");
      return;
    }
    const bodyContent = createElementWithClass("div", "rpm-reason-list");
    const createOption = (id, text) => {
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
    otherInput.addEventListener("input", () => {
      otherRadio.checked = true;
    });
    otherInput.addEventListener("focus", () => {
      otherRadio.checked = true;
    });
    otherInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        overlay.querySelector(".rpm-btn-primary")?.click();
      }
    });
    const overlay = createModalDialog(
      "Причина минуса",
      bodyContent,
      [
        {
          label: "Отмена",
          className: "rpm-btn",
          onClick: () => overlay.remove()
        },
        {
          label: "Отправить",
          className: "rpm-btn rpm-btn-primary",
          onClick: async () => {
            const submitBtn = overlay.querySelector(
              ".rpm-btn-primary"
            );
            const selectedReason = bodyContent.querySelector(
              'input[name="reason"]:checked'
            );
            if (!selectedReason) {
              notifyError("Выберите причину или введите свою.");
              return;
            }
            const reasonId = selectedReason.value === "other" ? null : parseInt(selectedReason.value);
            const reasonText = otherInput.value.trim();
            if (reasonId === null && reasonText.length === 0) {
              notifyError("Напишите причину.");
              otherInput.focus();
              return;
            }
            submitBtn.disabled = true;
            submitBtn.innerText = "Отправка...";
            try {
              await voteUser2(uid, vote, reasonId, reasonText, url);
              overlay.remove();
            } catch (e) {
              error(e);
              submitBtn.disabled = false;
              submitBtn.innerText = "Отправить";
            }
          }
        }
      ]
    );
  }
  function formatVoteDate(timestamp) {
    if (!timestamp) return "";
    const ms = timestamp < 1e12 ? timestamp * 1e3 : timestamp;
    return new Date(ms).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  async function showReasonsDialog(uid) {
    let votes;
    try {
      votes = await getUserVotes(uid);
    } catch (e) {
      error(e);
      notifyError("Не удалось загрузить причины голосов.");
      return;
    }
    const content = createElementWithClass("div", "rpm-votes-list");
    if (votes.length === 0) {
      content.append(
        Object.assign(createElementWithClass("div", "rpm-votes-message"), {
          textContent: "Голосов пока нет."
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
        sign.textContent = isPlus ? "+" : "−";
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
    createModalDialog(
      "Причины голосов",
      content,
      [
        {
          label: "Закрыть",
          className: "rpm-btn rpm-btn-primary",
          onClick: (overlay) => overlay.remove()
        }
      ]
    );
  }

  // src/rpm/nodes.ts
  function createLoadingIcon() {
    return createElementWithClass("div", "rpm-loading");
  }
  function createPoweredNote(text) {
    const elem = createElementWithClass("span", "rpm-powered");
    elem.innerHTML = text;
    return elem;
  }
  function createUserRatingNode(uid, url, infoConsumer = null) {
    const elem = createElementWithClass(
      "div",
      "rpm-user-rating",
      "hint",
      `rpm-user-rating-${uid}`
    );
    elem.setAttribute("aria-label", "Рейтинг автора в RPM");
    elem.setAttribute("pikabu-user-id", uid.toString());
    const loadingIcon = createLoadingIcon();
    elem.appendChild(loadingIcon);
    const plusElem = addSpan(elem, "rpm-pluses");
    addSpan(elem, "rpm-rating");
    const minusElem = addSpan(elem, "rpm-minuses");
    const openReasonsElem = addSpan(elem, "rpm-more-votes");
    openReasonsElem.innerHTML = OPEN_REASONS_ICON;
    openReasonsElem.addEventListener("click", () => {
      showReasonsDialog(uid);
    });
    attachVoteListeners(plusElem, minusElem, elem, uid, url);
    updateUserRatingElemAsync(elem, infoConsumer);
    return elem;
  }
  function createUserVoteReasonContainer(text) {
    const reasonElem = createElementWithClass(
      "div",
      "rpm-vote-reason-container"
    );
    const reasonTitleElem = createElementWithClass(
      "h4",
      "rpm-vote-reason-title"
    );
    reasonTitleElem.textContent = "Заметка RPM";
    const reasonTextElem = createElementWithClass(
      "p",
      "rpm-vote-reason"
    );
    reasonTextElem.textContent = text;
    reasonElem.append(reasonTitleElem, reasonTextElem);
    return reasonElem;
  }
  function addSpan(parent, cls) {
    const span = createElementWithClass("span", cls);
    span.innerText = "0";
    span.style.display = "none";
    parent.appendChild(span);
    return span;
  }
  function attachVoteListeners(plusElem, minusElem, elem, uid, url) {
    const handleVote = (vote) => voteCallback(elem, uid, vote, url);
    if (isAuthorized()) {
      plusElem.addEventListener("click", () => handleVote(1));
      minusElem.addEventListener("click", () => handleVote(-1));
    } else {
      const msgCallback = () => notifyError(
        "Авторизируйтесь в системе RPM в настройках скрипта, чтобы голосовать за авторов."
      );
      plusElem.addEventListener("click", msgCallback);
      minusElem.addEventListener("click", msgCallback);
    }
  }

  // src/config/schema.ts
  function validateRegex(value) {
    try {
      new RegExp(value);
      return null;
    } catch (e) {
      return "Некорректное регулярное выражение";
    }
  }
  function validateTemplate(argName) {
    return (value) => {
      try {
        new Function(argName, "return " + value);
        return null;
      } catch (e) {
        return "Некорректное JS-выражение";
      }
    };
  }
  var TEMPLATE_WARNING = "Внутри может выполняться любой код, поэтому используйте с осторожностью. Гарантированно работает только на Tampermonkey.";
  function createSections(rpm) {
    return [
      {
        id: "general",
        title: "Общие",
        fields: [
          {
            key: "summary",
            type: "checkbox",
            default: true,
            title: "Суммарный рейтинг",
            desc: "Показывать общий рейтинг у постов и комментариев."
          },
          {
            key: "minRatesCountToShowRatingBar",
            type: "int",
            default: 3,
            title: "Минимум оценок для шкалы",
            desc: "Сколько оценок должно быть у поста или комментария, чтобы показать соотношение плюсов и минусов. 0 — показывать всегда."
          },
          {
            key: "noLinkTracking",
            type: "checkbox",
            default: true,
            title: "Убирать трекеры из ссылок"
          }
        ]
      },
      {
        id: "stories",
        title: "Посты",
        fields: [
          {
            key: "minStoryRating",
            type: "int",
            default: 100,
            title: "Минимальный рейтинг поста",
            desc: "Посты с рейтингом ниже указанного будут удаляться из ленты. Их можно увидеть в списке просмотренных."
          },
          {
            key: "ratingBar",
            type: "checkbox",
            default: true,
            title: "Шкала плюсов и минусов",
            desc: "Если у поста нет оценок, будет показано соотношение 1:1."
          },
          {
            key: "storyCounters",
            type: "checkbox",
            default: true,
            title: "Счётчики плюсов и минусов"
          },
          {
            key: "showBlockAuthorForeverButton",
            type: "checkbox",
            default: true,
            title: "Кнопка «Заблокировать автора навсегда»",
            desc: "Добавляет автора в игнор-лист. Нужно быть авторизованным на сайте, иначе кнопка не работает."
          },
          {
            key: "blockPaidAuthors",
            type: "checkbox",
            default: true,
            title: "Скрывать посты авторов с Пикабу+",
            desc: "Удаляет из ленты посты проплаченных авторов."
          },
          {
            key: "videoDownloadButtons",
            type: "checkbox",
            default: true,
            title: "Ссылки на источники видео",
            desc: "Добавляет ко всем видео в постах ссылки на источники, если их удалось найти."
          },
          {
            key: "socialLinks",
            type: "checkbox",
            default: false,
            title: "Значки соцсетей в заголовке",
            desc: "Добавляет значки Телеграма, ВК и Тиктока в начало заголовка, если в посте есть такие ссылки."
          }
        ]
      },
      {
        id: "comments",
        title: "Комментарии",
        fields: [
          {
            key: "ratingBarComments",
            type: "checkbox",
            default: true,
            title: "Шкала плюсов и минусов"
          },
          {
            key: "commentCounters",
            type: "checkbox",
            default: true,
            title: "Счётчики плюсов и минусов"
          },
          {
            key: "commentVideoDownloadButtons",
            type: "checkbox",
            default: true,
            title: "Ссылки на источники видео",
            desc: "Добавляет ко всем видео в комментариях ссылки на источники, если их удалось найти."
          },
          {
            key: "unrollCommentaries",
            type: "select",
            default: "Стандартная пикабушная кнопка" /* NONE */,
            options: [
              "Стандартная пикабушная кнопка" /* NONE */,
              'Дополнительная кнопка "Раскрыть всё"' /* UNROLL_ALL_BUTTON */,
              "Автоматическая раскрутка всех комментариев" /* AUTO_UNROLL */
            ],
            title: "Раскрытие веток комментариев"
          },
          // DEPRECATED: migrated to unrollCommentaries
          { key: "unrollCommentariesAutomatically", type: "hidden", default: void 0 }
        ]
      },
      {
        id: "tabs",
        title: "Вкладки Пикабу",
        desc: "Включает и выключает вкладки сверху. Работает только на ПК.",
        fields: [
          { key: "hotTab", type: "checkbox", default: true, title: "Горячее" },
          { key: "bestTab", type: "checkbox", default: true, title: "Лучшее" },
          { key: "newTab", type: "checkbox", default: true, title: "Свежее" },
          { key: "subsTab", type: "checkbox", default: true, title: "Подписки" },
          { key: "communitiesTab", type: "checkbox", default: true, title: "Сообщества" },
          { key: "blogsTab", type: "checkbox", default: true, title: "Блоги" },
          { key: "expertsTab", type: "checkbox", default: true, title: "Эксперты" }
        ]
      },
      {
        id: "rpm",
        title: "RPM",
        desc: "Дополнительные функции скрипта. Используется сервер rpm.pyxiion.ru.",
        fields: [
          {
            key: "rpmEnabled",
            type: "checkbox",
            default: true,
            title: "Рейтинг авторов у постов"
          },
          {
            key: "rpmMinStoryRating",
            type: "int",
            default: 0,
            title: "Минимальный рейтинг автора",
            desc: "Если рейтинг автора в системе RPM меньше этого значения, его посты будут удалены из ленты."
          },
          {
            key: "rpmIgnoreDownvoted",
            type: "checkbox",
            default: true,
            title: "Скрывать посты авторов с вашим минусом",
            desc: "Работает как игнор-лист."
          },
          {
            key: "rpmComments",
            type: "checkbox",
            default: true,
            title: "Рейтинг авторов у комментариев"
          },
          {
            key: "rpmStoryVoteReason",
            type: "checkbox",
            default: true,
            title: "Показывать причину вашей оценки",
            desc: "Причина (если она есть) отображается в начале поста."
          },
          {
            key: "registerRpm",
            type: "button",
            title: "Регистрация в RPM",
            action: "Зарегистрироваться",
            desc: "Нужна, чтобы оценивать авторов. После регистрации страница перезагрузится.",
            click: rpm.register
          },
          {
            key: "copyRpmToken",
            type: "button",
            title: "Токен RPM",
            action: "Скопировать",
            desc: "Ваш личный ключ в RPM. Никому его не показывайте: по нему можно голосовать от вашего имени. Он нужен, если вы просите удалить связанные с вами данные.",
            click: rpm.copyToken
          },
          {
            key: "resetRpmToken",
            type: "button",
            title: "Сбросить токен",
            action: "Сбросить",
            desc: "Выдаёт новый токен. Ваши прошлые оценки останутся на сервере под старым токеном, и вы больше не сможете их изменить.",
            click: rpm.resetToken
          },
          { key: "uuid", type: "hidden", default: "" }
        ]
      },
      {
        id: "mini-profile",
        title: "Мини-профили",
        desc: "Дополнения в мини-профиле пользователя, который появляется при наведении на ник.",
        fields: [
          {
            key: "miniProfileEditableNote",
            type: "checkbox",
            default: true,
            title: "Заметка о пользователе",
            desc: "Редактируемая заметка, которую видите только вы."
          },
          {
            key: "miniProfileStoryTags",
            type: "checkbox",
            default: true,
            title: "Основные теги постов пользователя"
          },
          {
            key: "miniProfileСommentTags",
            type: "checkbox",
            default: true,
            title: "Теги постов, которые комментирует пользователь"
          },
          {
            key: "miniProfileСomments",
            type: "checkbox",
            default: false,
            title: "Последние комментарии пользователя"
          },
          {
            key: "miniProfileAutoloadTags",
            type: "checkbox",
            default: false,
            title: "Автозагрузка тегов"
          },
          {
            key: "miniProfileAutoloadComments",
            type: "checkbox",
            default: false,
            title: "Автозагрузка последних комментариев"
          },
          {
            key: "miniProfileAutoloadPikabuCommentCount",
            type: "number",
            default: 1,
            title: "Сколько комментариев загружать сразу",
            desc: "Остальные подгружаются по кнопке «Загрузить»."
          },
          {
            key: "miniProfileOrientation",
            type: "select",
            default: "Горизонтально" /* HORIZONTAL */,
            options: [
              "Горизонтально" /* HORIZONTAL */,
              "Вертикально" /* VERTICAL */
            ],
            title: "Расположение блоков"
          }
        ]
      },
      {
        id: "profile",
        title: "Профили",
        desc: "То же самое, но на странице профиля пользователя.",
        fields: [
          {
            key: "profileStoryTags",
            type: "checkbox",
            default: true,
            title: "Основные теги постов пользователя"
          },
          {
            key: "profileСommentTags",
            type: "checkbox",
            default: true,
            title: "Теги постов, которые комментирует пользователь"
          },
          {
            key: "profileСomments",
            type: "checkbox",
            default: true,
            title: "Последние комментарии пользователя"
          },
          {
            key: "profileAutoloadComments",
            type: "checkbox",
            default: true,
            title: "Автозагрузка последних комментариев"
          },
          {
            key: "profileAutoloadPikabuCommentCount",
            type: "number",
            default: 3,
            title: "Сколько комментариев загружать сразу",
            desc: "Остальные подгружаются по кнопке «Загрузить»."
          }
        ]
      },
      {
        id: "advanced",
        title: "Продвинутые",
        fields: [
          {
            key: "filteringPageRegex",
            type: "text",
            default: "^https?:\\/\\/pikabu.ru\\/(|best|companies|browse|disputed|most-saved)$",
            title: "Страницы с фильтрацией по рейтингу",
            desc: "Регулярное выражение, которому должен соответствовать адрес страницы.",
            validate: validateRegex
          },
          {
            key: "minusesPattern",
            type: "text",
            default: "story.minuses",
            title: "Шаблон минусов у постов",
            desc: "JS-выражение. Пример: `story.minuses * 5000`. story: {id, rating, pluses, minuses}. " + TEMPLATE_WARNING,
            validate: validateTemplate("story")
          },
          {
            key: "minusesCommentPattern",
            type: "text",
            default: "comment.minuses",
            title: "Шаблон минусов у комментариев",
            desc: "JS-выражение. Пример: `comment.minuses * 5000`. comment: {id, rating, pluses, minuses}.",
            validate: validateTemplate("comment")
          },
          {
            key: "ownCommentPattern",
            type: "text",
            default: "comment.pluses == 0 && comment.minuses == 0 ? 0 : comment.pluses == comment.minuses ? `+${comment.pluses} / -${comment.minuses}` : comment.pluses == 0 ? `-${comment.minuses}` : comment.minuses == 0 ? `+${comment.pluses}` : `+${comment.pluses} / ${comment.rating} / -${comment.minuses}`",
            title: "Шаблон рейтинга у ваших комментариев",
            desc: "JS-выражение. comment: {id, rating, pluses, minuses}.",
            validate: validateTemplate("comment")
          },
          {
            key: "debug",
            type: "checkbox",
            default: false,
            title: "Отладочные логи",
            desc: "Выводит дополнительные сообщения в консоль. Для разработки и отладки."
          }
        ]
      }
    ];
  }

  // src/config/ui.ts
  var PREFIX = "prm";
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function isVisible(def) {
    return def.type !== "hidden";
  }
  function enhanceSettingsUI(frame2, config, sections) {
    const wrapper = frame2.querySelector(`#${PREFIX}_wrapper`);
    if (!wrapper) return;
    bindFrameEvents(frame2, config);
    const header = wrapper.querySelector(`#${PREFIX}_header`);
    const buttonsHolder = wrapper.querySelector(`#${PREFIX}_buttons_holder`);
    const holders = Array.from(
      wrapper.querySelectorAll(".section_header_holder")
    );
    const panels = [];
    const rows = [];
    const validators = [];
    sections.forEach((section, index) => {
      const panel = holders[index];
      if (!panel) return;
      panels.push(panel);
      panel.classList.add("rpm-panel");
      panel.querySelector(".section_header")?.remove();
      panel.querySelector(".section_desc")?.remove();
      const head = el("div", "rpm-panel-head");
      head.append(el("h2", "rpm-panel-title", section.title));
      if (section.desc) head.append(el("p", "rpm-panel-desc", section.desc));
      panel.prepend(head);
      for (const def of section.fields) {
        const field = config.fields[def.key];
        const row = field?.wrapper;
        if (!field || !row) continue;
        if (!isVisible(def)) {
          row.hidden = true;
          continue;
        }
        buildRow(row, def, section.title);
        rows.push({ row, panelIndex: index });
        if (def.type === "text" && def.validate) {
          const input = field.node;
          const hint = el("div", "rpm-row-error");
          hint.hidden = true;
          row.append(hint);
          const check = () => {
            const message = def.validate(input.value);
            input.classList.toggle("rpm-invalid", message !== null);
            hint.textContent = message ?? "";
            hint.hidden = message === null;
          };
          input.addEventListener("input", check);
          validators.push(check);
        }
      }
    });
    validators.forEach((v) => v());
    const titleBlock = el("div", "rpm-title-block");
    while (header.firstChild) titleBlock.append(header.firstChild);
    const search = el("input", "rpm-search");
    search.type = "search";
    search.placeholder = "Поиск по настройкам";
    search.setAttribute("aria-label", "Поиск по настройкам");
    header.classList.add("rpm-header");
    header.append(titleBlock, search);
    const nav = el("nav", "rpm-nav");
    const content = el("div", "rpm-content");
    const empty = el("div", "rpm-empty", "Ничего не найдено");
    empty.hidden = true;
    content.append(...panels, empty);
    const body = el("div", "rpm-body");
    body.append(nav, content);
    const saveBtn = buttonsHolder.querySelector(`#${PREFIX}_saveBtn`);
    const closeBtn = buttonsHolder.querySelector(`#${PREFIX}_closeBtn`);
    const resetLink = buttonsHolder.querySelector(`#${PREFIX}_resetLink`);
    saveBtn.textContent = "Сохранить";
    saveBtn.title = "Сохранить настройки";
    saveBtn.className = "rpm-btn rpm-btn-primary";
    closeBtn.textContent = "Закрыть";
    closeBtn.title = "Закрыть окно";
    closeBtn.className = "rpm-btn";
    resetLink.textContent = "Сбросить к значениям по умолчанию";
    resetLink.title = "Вернуть все поля к значениям по умолчанию (изменения нужно сохранить)";
    resetLink.className = "rpm-reset";
    const dirtyNote = el("span", "rpm-dirty", "Есть несохранённые изменения");
    dirtyNote.hidden = true;
    const setDirty = (dirty) => {
      dirtyNote.hidden = !dirty;
    };
    buttonsHolder.classList.add("rpm-footer");
    buttonsHolder.replaceChildren(resetLink, dirtyNote, closeBtn, saveBtn);
    content.addEventListener("input", () => setDirty(true));
    content.addEventListener("change", () => setDirty(true));
    resetLink.addEventListener("click", () => {
      setTimeout(() => {
        validators.forEach((v) => v());
        setDirty(true);
      });
    });
    saveBtn.addEventListener("click", () => setDirty(false));
    wrapper.replaceChildren(header, body, buttonsHolder);
    let active = 0;
    const navButtons = sections.map((section, index) => {
      const button = el("button", "rpm-nav-item", section.title);
      button.type = "button";
      button.addEventListener("click", () => {
        search.value = "";
        active = index;
        render();
        content.scrollTop = 0;
      });
      nav.append(button);
      return button;
    });
    function render() {
      const query = search.value.trim().toLowerCase();
      frame2.classList.toggle("rpm-searching", query !== "");
      const matches = new Array(panels.length).fill(0);
      for (const { row, panelIndex } of rows) {
        const match = query === "" || (row.dataset.search ?? "").includes(query);
        row.hidden = !match;
        if (match) matches[panelIndex]++;
      }
      panels.forEach((panel, index) => {
        panel.hidden = query === "" ? index !== active : matches[index] === 0;
      });
      navButtons.forEach((button, index) => {
        button.classList.toggle("rpm-active", query === "" && index === active);
      });
      empty.hidden = query === "" || matches.some((count) => count > 0);
    }
    search.addEventListener("input", render);
    search.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && search.value !== "") {
        e.stopPropagation();
        search.value = "";
        render();
      }
    });
    render();
    frame2.focus();
  }
  function buildRow(row, def, sectionTitle) {
    const control = row.querySelector(`[id^="${PREFIX}_field_"]`);
    const label = row.querySelector(".field_label");
    if (!control) return;
    row.classList.add("rpm-row", `rpm-row-${def.type}`);
    const text = el("div", "rpm-row-label");
    if (def.type === "button") {
      text.append(el("div", "rpm-row-title", def.title));
    } else if (label) {
      label.classList.add("rpm-row-title");
      text.append(label);
    }
    if (def.desc) text.append(el("div", "rpm-row-desc", def.desc));
    const controlBox = el("div", "rpm-row-control");
    controlBox.append(control);
    row.replaceChildren(text, controlBox);
    row.dataset.search = `${def.title} ${def.desc ?? ""} ${sectionTitle}`.toLowerCase();
    if (def.type === "checkbox") {
      row.addEventListener("click", (e) => {
        const target = e.target;
        if (target === control || target.closest("label")) return;
        control.click();
      });
    }
  }
  function bindFrameEvents(frame2, config) {
    if (frame2.dataset.rpmBound) return;
    frame2.dataset.rpmBound = "true";
    frame2.tabIndex = -1;
    frame2.addEventListener("mousedown", (e) => {
      if (e.target === frame2) config.close();
    });
    frame2.addEventListener("keydown", (e) => {
      if (e.key === "Escape") config.close();
    });
  }

  // src/config/config.ts
  var frame = document.createElement("div");
  document.body.appendChild(frame);
  async function handleOldConfigFields() {
    let config;
    try {
      const stored = await GM.getValue("prm", "{}");
      config = typeof stored === "string" ? JSON.parse(stored) : stored;
    } catch {
      return;
    }
    if (!config || typeof config !== "object") return;
    let changed = false;
    if ("unrollCommentariesAutomatically" in config) {
      if (config.unrollCommentariesAutomatically) {
        config.unrollCommentaries = "Автоматическая раскрутка всех комментариев" /* AUTO_UNROLL */;
      }
      delete config.unrollCommentariesAutomatically;
      changed = true;
    }
    if (changed) await GM.setValue("prm", JSON.stringify(config));
  }
  async function registerInRpm() {
    const uuid = GM_config.get("uuid");
    if (uuid === null || uuid === void 0 || uuid === "") {
      GM_config.set("uuid", await service_exports.register());
      GM_config.save();
      notifySuccess(
        "Вы успешно зарегистрировались. Или нет. Проверки успешности не существует."
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
  async function copyRpmToken() {
    const uuid = GM_config.get("uuid");
    if (!uuid) return;
    try {
      await navigator.clipboard.writeText(uuid);
      notifySuccess("Токен скопирован в буфер обмена.");
    } catch {
      window.prompt("Скопируйте токен вручную:", uuid);
    }
  }
  async function resetRpmToken() {
    if (!GM_config.get("uuid")) return;
    const ok = window.confirm(
      "Сбросить токен RPM?\n\nВы получите новый токен. Прошлые оценки останутся на сервере под старым токеном, и вы больше не сможете их изменить. Это нельзя отменить."
    );
    if (!ok) return;
    try {
      const newUuid = await service_exports.register();
      if (typeof newUuid !== "string" || !newUuid) throw new Error("empty token");
      GM_config.set("uuid", newUuid);
      GM_config.save();
    } catch {
      notifyError("Не удалось получить новый токен. Старый токен сохранён.");
      return;
    }
    notifySuccess("Новый токен получен. Страница перезагрузится.");
    await sleep(300);
    window.location.reload();
  }
  function createTitle() {
    const title = document.createElement("div");
    title.classList.add("rpm-title");
    const name = document.createElement("h1");
    name.textContent = "Return Pikabu minus";
    const links = document.createElement("div");
    links.classList.add("rpm-links");
    const addLink = (text, url) => {
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
  function toGmField(def, firstOfSection) {
    const field = { type: def.type };
    if (firstOfSection) {
      field.section = firstOfSection.desc ? [firstOfSection.title, firstOfSection.desc] : [firstOfSection.title];
    }
    if (def.type === "hidden") {
      field.default = def.default;
      return field;
    }
    field.label = def.type === "button" ? def.action : def.title;
    if (def.type === "button") {
      field.click = def.click;
    } else {
      field.default = def.default;
      if (def.type === "select") field.options = def.options;
    }
    return field;
  }
  function applyDerivedSettings(config) {
    formats.formatStoryMinuses = makeEval(
      "story",
      config.get("minusesPattern"),
      (x) => x.minuses
    );
    formats.formatCommentMinuses = makeEval(
      "comment",
      config.get("minusesCommentPattern"),
      (x) => x.minuses
    );
    formats.formatOwnComment = makeEval(
      "comment",
      config.get("ownCommentPattern"),
      (x) => x.pluses == 0 && x.minuses == 0 ? 0 : `${x.pluses}/${x.minuses}`
    );
    try {
      appState.enableFilters = new RegExp(
        config.get("filteringPageRegex")
      ).test(window.location.href);
    } catch {
      appState.enableFilters = false;
    }
  }
  async function handleConfig() {
    await handleOldConfigFields();
    const sections = createSections({ register: registerInRpm, copyToken: copyRpmToken, resetToken: resetRpmToken });
    const fields = {};
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
              "Автоматическая раскрутка всех комментариев" /* AUTO_UNROLL */
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
            3e3,
            false,
            "success"
          );
        }
      }
    });
  }

  // src/features/rating.ts
  function getRealRating(value, vid, authorId) {
    const OFFSET = 253537024;
    const MOD_O = 99;
    const MOD_R = 98;
    if (value >= 0) {
      return value;
    }
    vid = parseInt(String(vid).replace(/\D/g, ""), 10);
    const a = vid % MOD_O + 1;
    const l = authorId % MOD_R;
    return Math.floor((-value - l) / a - OFFSET);
  }
  function replaceRating(ratingElem, vote, pluses, minuses, isComment = false, onChange = null) {
    const summary = GM_config.get("summary");
    const shouldCreateOtherCounters = isComment ? GM_config.get("commentCounters") : GM_config.get("storyCounters");
    const ratingBlock = ratingElem.parentElement;
    const plusBtn = ratingBlock.querySelector(".story__rating-up, .comment__rating-up");
    const minusBtn = ratingBlock.querySelector(".story__rating-down, .comment__rating-down");
    let rating = pluses - minuses;
    if (summary) {
      ratingElem.textContent = (rating + vote).toString();
    } else {
      ratingElem.style.display = "none";
    }
    let plusesElem, minusesElem;
    if (shouldCreateOtherCounters) {
      plusesElem = document.createElement("div");
      minusesElem = document.createElement("div");
      plusesElem.classList.add("rpm-new-rating-counter", "rpm-counter-plus");
      minusesElem.classList.add("rpm-new-rating-counter", "rpm-counter-minus");
      ratingBlock.insertBefore(plusesElem, ratingElem);
      ratingBlock.insertBefore(minusesElem, ratingElem.nextSibling);
      plusesElem.textContent = (pluses + (vote === 1 ? 1 : 0)).toString();
      minusesElem.textContent = (minuses + (vote === -1 ? 1 : 0)).toString();
    }
    const onClick = (btn) => {
      if (btn === vote) {
        vote -= btn;
      } else {
        vote += btn;
      }
      if (onChange)
        onChange(pluses + (vote === 1 ? 1 : 0), minuses + (vote === -1 ? 1 : 0));
      if (shouldCreateOtherCounters && plusesElem && minusesElem) {
        plusesElem.textContent = (pluses + (vote === 1 ? 1 : 0)).toString();
        minusesElem.textContent = (minuses + (vote === -1 ? 1 : 0)).toString();
      }
      if (summary)
        setTimeout(() => ratingElem.innerHTML = (rating + vote).toString(), 5);
    };
    plusBtn.addEventListener("click", () => onClick(1));
    minusBtn.addEventListener("click", () => onClick(-1));
  }

  // src/features/story-ui.ts
  var blockIconTemplate = (function() {
    const div = document.createElement("div");
    div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__save"><use xlink:href="#icon--ui__ban"></use></svg>`;
    return div.firstChild;
  })();
  async function blockAuthorForever(button, authorId) {
    button.disabled = true;
    try {
      await fetch(
        `https://pikabu.ru/ajax/ignore_actions.php?authors=${authorId}&story_id=0&period=forever&action=add_rule`,
        {
          method: "POST"
        }
      );
      button.remove();
      info("Автор с ID", authorId, "заблокирован");
    } catch {
      button.disabled = false;
      error(
        "Не получилось заблокировать автора с ID",
        authorId,
        ", возможно отсутствует Интернет-соединение"
      );
    }
  }
  function addBlockButton(story) {
    const saveButton = story.querySelector(".story__save");
    if (saveButton === null) {
      warn("Failed to add a block button to", story);
      return;
    }
    const button = document.createElement("button");
    button.classList.add("rpm-block-author", "hint");
    button.setAttribute("aria-label", "Заблокировать автора навсегда");
    button.appendChild(blockIconTemplate.cloneNode(true));
    const authorId = parseInt(story.getAttribute("data-author-id"));
    button.addEventListener("click", () => {
      blockAuthorForever(button, authorId);
    });
    saveButton.parentElement?.insertBefore(button, saveButton);
  }
  function ratioToPercent(ratio) {
    const safe = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0.5;
    return `${(safe * 100).toFixed(1)}%`;
  }
  function addRatingBar(story, ratio) {
    const block = story.querySelector(
      ".story__rating-block, .comment__body, .story__emotions"
    );
    if (block === null) return null;
    const bar = document.createElement("div");
    const inner = document.createElement("div");
    bar.append(inner);
    bar.classList.add("rpm-rating-bar");
    inner.classList.add("rpm-rating-bar-inner");
    inner.style.height = ratioToPercent(ratio);
    block.prepend(bar);
    return inner;
  }
  function updateRatingBar(innerRatingBarElem, pluses, minuses) {
    if (!innerRatingBarElem) return;
    const total = pluses + minuses;
    innerRatingBarElem.style.height = ratioToPercent(total > 0 ? pluses / total : 0.5);
  }

  // src/features/comments.ts
  function getCommentAuthorId(comment) {
    if (comment.hasAttribute("data-author-id")) {
      return parseInt(comment.getAttribute("data-author-id"));
    }
    if (comment.hasAttribute("data-meta")) {
      return parseInt(
        comment.getAttribute("data-meta").match(/(?:^|;)aid=(\d+)(?:;|$)/)[1]
      );
    }
    return null;
  }
  function getCommentMeta(comment, key) {
    if (comment.hasAttribute("data-meta")) {
      const matches = comment.getAttribute("data-meta").match(`(?:^|;)${key}=(.+?)(?:;|$)`);
      if (matches !== null && matches.length > 1)
        return matches[1];
    }
    return null;
  }
  function handleComment(comment) {
    const count = comment.querySelector(".comment__rating-count");
    if (!count || count.classList.contains("rpm-processed")) return;
    count.classList.add("rpm-processed");
    if (count.parentElement?.querySelector(".rpm-new-rating-counter")) return;
    info("Поймал комментарий!", comment);
    if (GM_config.get("rpmComments")) processCommentRpm(comment);
    processComment(comment);
  }
  async function processComment(commentElem) {
    const commentRatingBlock = commentElem.querySelector(".comment__rating");
    if (commentRatingBlock.childElementCount === 1)
      return;
    const vid = commentElem.getAttribute("data-id");
    const authorId = parseInt(commentElem.getAttribute("data-author-id"));
    const pluses = getRealRating(parseInt(commentRatingBlock.getAttribute("data-pluses")), vid, authorId);
    const minuses = getRealRating(parseInt(commentRatingBlock.getAttribute("data-minuses")), vid, authorId);
    const vote = parseInt(getCommentMeta(commentElem, "v") || "0");
    let onVoteCallback = null;
    if (GM_config.get("ratingBarComments") && pluses + minuses !== 0 && pluses + minuses >= GM_config.get("minRatesCountToShowRatingBar")) {
      const bar = addRatingBar(commentElem, pluses / (pluses + minuses));
      onVoteCallback = (pluses2, minuses2) => {
        updateRatingBar(bar, pluses2, minuses2);
      };
    }
    replaceRating(commentElem.querySelector(".comment__rating-count"), vote, pluses, minuses, true, onVoteCallback);
    if (GM_config.get("commentVideoDownloadButtons")) {
      processCommentVideos(commentElem);
    }
  }
  function processCommentRpm(comment) {
    const uid = getCommentAuthorId(comment);
    if (!uid) return;
    if (comment.querySelector(":scope > .comment__body > .comment__header .rpm-user-rating")) return;
    let url = comment.getAttribute("data-copy-url");
    if (!url) url = comment.querySelector(':scope > .comment__body > .comment__header a.comment__tool[data-role="link"]').href;
    const commentHeader = comment.querySelector(".comment__header");
    const elem = nodes_exports.createUserRatingNode(uid, url);
    commentHeader.insertBefore(
      elem,
      commentHeader.querySelector(".comment__right")
    );
  }
  function processCommentVideos(commentElem) {
    const videoElements = commentElem.querySelectorAll(
      ":scope > .comment__body .comment-external-video"
    );
    for (const videoElem of videoElements) {
      const content = videoElem.querySelector(".comment-external-video__content");
      if (!content) continue;
      const url = content.getAttribute("data-external-link");
      if (!url) continue;
      const linkElem = document.createElement("a");
      linkElem.classList.add("rpm-download-video-button");
      linkElem.href = url;
      linkElem.text = "Источник";
      linkElem.target = "_blank";
      videoElem.parentNode.insertBefore(linkElem, videoElem.nextSibling);
    }
  }

  // src/gollum/api.ts
  function createGollumTagsGetter(tagsType) {
    return async (userId) => {
      const request = new HttpRequest(
        `https://gollum.space/api/${userId}-${tagsType}`,
        "GET",
        "json"
      );
      const response = await request.executeAsync();
      const data = response.response;
      return Object.values(data).map((x) => x.TagRU);
    };
  }
  var storyTagsGetter = createGollumTagsGetter("PostTags");
  var commentTagsGetter = createGollumTagsGetter("CommentTags");
  var idsCache = /* @__PURE__ */ new Map();
  async function getUserId(userName) {
    if (idsCache.has(userName)) {
      return idsCache.get(userName);
    }
    const request = new HttpRequest(
      `https://gollum.space/user/${userName.replace(/\./g, "_")}-summary`,
      "GET",
      "text"
    );
    const response = await request.executeAsync();
    const doc = response.responseText;
    const match = doc?.match(/\/api\/(\d+)-/i);
    if (!match) throw new Error(`Gollum: user ${userName} was not found`);
    const id = parseInt(match[1]);
    idsCache.set(userName, id);
    return id;
  }

  // src/gollum/status.ts
  function createStatusMessage(text, onRetry) {
    const elem = document.createElement("div");
    elem.classList.add("rpm-status");
    const message = document.createElement("span");
    message.textContent = text;
    elem.append(message);
    if (onRetry) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.classList.add("rpm-btn", "rpm-btn-small");
      retry.textContent = "Повторить";
      retry.addEventListener("click", onRetry);
      elem.append(retry);
    }
    return elem;
  }
  function createLoadButton(text, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("rpm-btn", "rpm-btn-small");
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }

  // src/gollum/last-comments.ts
  var CHUNK_SIZE = 5;
  var COMMENT_UP_DEPTH = 2;
  var parser = new DOMParser();
  async function loadCommentFromPikabu(info2, parent = false, disableMiniProfile = false) {
    const request = new HttpRequest(info2.link, "GET", "arraybuffer", {
      anonymous: false
    });
    request.addHeader(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
    );
    const response = await request.executeAsync();
    const buffer = response.response;
    const dec = new TextDecoder("windows-1251");
    const body = dec.decode(new Uint8Array(buffer));
    const htmlDoc = parser.parseFromString(body, "text/html");
    const wantedElem = htmlDoc.querySelector(
      parent === false ? `#comment_${info2.id}` : ".comments"
    );
    const clone = wantedElem.cloneNode(true);
    return postprocessPikabuComment(clone, info2.id, disableMiniProfile);
  }
  function postprocessPikabuComment(element, commentId, disableMiniProfile = false) {
    element.classList.add("rpm-comment-no-js");
    element.querySelectorAll(".comment").forEach((x) => {
      x.classList.add(x.getAttribute("id"));
      x.removeAttribute("id");
      const children2 = x.querySelector(
        ":scope > .comment__children"
      );
      const toggle2 = x.querySelector(
        ":scope > .comment-toggle-children"
      );
      if (children2 && toggle2) {
        toggle2.addEventListener("click", (e) => {
          e.preventDefault();
          children2.toggleAttribute("hidden");
          toggle2.classList.toggle("comment-toggle-children_collapse");
        });
      }
      x.querySelectorAll(":scope > .comment__body .vue-video-player").forEach((e) => {
        const source = e.getAttribute("data-source");
        if (source === "") return;
        const img = document.createElement("img");
        img.src = source;
        img.style.width = "100%";
        e.parentElement.replaceWith(img);
      });
    });
    const commentElem = element.querySelector(
      `.comment_${commentId}`
    );
    commentElem.classList.add("rpm-highlight-comment");
    const children = commentElem.querySelector(
      ":scope > .comment__children"
    );
    const toggle = commentElem.querySelector(
      ":scope > .comment-toggle-children"
    );
    if (children && toggle) {
      children.toggleAttribute("hidden");
      toggle.classList.toggle("comment-toggle-children_collapse");
    }
    let parent = commentElem;
    for (let i = 0; i < COMMENT_UP_DEPTH; ++i) {
      const container = parent.parentElement;
      if (container !== null && container.matches(".comment__children")) {
        for (const child of container.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE && !parent.isSameNode(child)) {
            child.remove();
          }
        }
        const parentComment = container.parentElement;
        parent = parentComment;
      }
    }
    if (disableMiniProfile) {
      element.querySelectorAll(".comment__user").forEach((x) => {
        x.removeAttribute("data-profile");
      });
    }
    element.querySelectorAll("img").forEach((x) => {
      if (x.hasAttribute("data-src")) {
        x.src = x.getAttribute("data-src");
        x.classList.add("image-loaded");
      }
    });
    return parent;
  }
  function createCommentContainer(info2, autoload, disableMiniProfile) {
    const container = document.createElement("div");
    container.classList.add("rpm-comment-container");
    const title = document.createElement("a");
    title.href = info2.link;
    title.target = "_blank";
    title.textContent = `${info2.rating} | ${info2.postTitle}`;
    let current;
    const loadFull = async () => {
      const icon = nodes_exports.createLoadingIcon();
      current.replaceWith(icon);
      current = icon;
      try {
        const pikabuComment = await loadCommentFromPikabu(
          info2,
          true,
          disableMiniProfile
        );
        icon.replaceWith(pikabuComment);
        current = pikabuComment;
      } catch (e) {
        error(e);
        const status = createStatusMessage("Не удалось загрузить комментарий.", loadFull);
        icon.replaceWith(status);
        current = status;
      }
    };
    const preview = createCommentPreview(info2, loadFull);
    current = preview;
    container.append(title, preview);
    if (autoload) {
      loadFull();
    }
    return container;
  }
  function createCommentPreview(info2, loadCallback) {
    const container = document.createElement("div");
    container.classList.add("rpm-comment-preview");
    const buttonToLoad = createLoadButton("Загрузить", loadCallback);
    container.append(buttonToLoad);
    return container;
  }
  async function loadCommentsFromGollum(userName) {
    userName = userName.replace(/\./g, "_");
    const request = new HttpRequest(
      `https://gollum.space/user/${userName}-last`,
      "GET",
      "document"
    );
    const response = await request.executeAsync();
    const htmlDoc = response.response;
    if (!htmlDoc) throw new Error("Gollum returned no document");
    const comments = Array.from(
      htmlDoc.querySelectorAll(".comment-block")
    );
    const result = [];
    for (const elem of comments) {
      const anchor = elem.querySelector(".comment-link");
      const [rating = "", postTitle = ""] = (elem.getAttribute("title") ?? "").split("|").map((x) => x.trim());
      if (!anchor) continue;
      result.push({
        id: parseInt(anchor.textContent),
        postId: parseInt(elem.getAttribute("post")),
        postTitle,
        rating,
        link: anchor.href.replace("pikabu.ru", "gollum.space")
      });
    }
    return result;
  }
  function createLastCommentsSection(userName, autoloadGollum = false, autoloadCount = 0, disableMiniProfile = false) {
    const main = document.createElement("div");
    main.classList.add("rpm-last-comments");
    const title = document.createElement("h4");
    title.textContent = "Последние комментарии";
    const containerOfComments = document.createElement("div");
    containerOfComments.classList.add("rpm-last-comments-container");
    let comments = null;
    let shown = 0;
    const renderNextChunk = () => {
      const end = Math.min(shown + CHUNK_SIZE, comments.length);
      for (; shown < end; shown++) {
        containerOfComments.append(
          createCommentContainer(
            comments[shown],
            shown < autoloadCount,
            disableMiniProfile
          )
        );
      }
      loadMoreBtn.textContent = "Больше комментариев";
      if (shown >= comments.length) loadMoreBtn.remove();
    };
    const load = async () => {
      const loadingIcon = nodes_exports.createLoadingIcon();
      containerOfComments.append(loadingIcon);
      loadMoreBtn.style.display = "none";
      try {
        comments = await loadCommentsFromGollum(userName);
      } catch (e) {
        error(e);
        loadingIcon.remove();
        const status = createStatusMessage(
          "Не удалось загрузить комментарии. Голлум недоступен?",
          () => {
            status.remove();
            load();
          }
        );
        containerOfComments.append(status);
        return;
      }
      loadingIcon.remove();
      loadMoreBtn.style.display = "";
      if (comments.length === 0) {
        containerOfComments.append(createStatusMessage("Комментарии не найдены."));
        loadMoreBtn.remove();
      } else {
        renderNextChunk();
      }
    };
    const loadMoreBtn = createLoadButton("Загрузить", () => {
      if (comments) renderNextChunk();
      else load();
    });
    main.append(title, containerOfComments, loadMoreBtn);
    if (autoloadGollum) load();
    return main;
  }

  // src/gollum/tags-section.ts
  function createTag(name) {
    const elem = document.createElement("span");
    elem.classList.add("rpm-tags-tag");
    elem.textContent = name;
    return elem;
  }
  function createTagsSection(userName, tagsGetter, autoload = false) {
    const elem = document.createElement("div");
    elem.classList.add("rpm-tags-list");
    const loadTags = async () => {
      elem.replaceChildren(nodes_exports.createLoadingIcon());
      try {
        const userId = await getUserId(userName);
        const tags = await tagsGetter(userId);
        elem.replaceChildren(
          ...tags.length > 0 ? tags.map(createTag) : [createStatusMessage("Теги не найдены.")]
        );
      } catch (e) {
        error(e);
        elem.replaceChildren(
          createStatusMessage("Не удалось получить теги. Голлум недоступен?", loadTags)
        );
      }
    };
    if (autoload) {
      loadTags();
    } else {
      elem.append(createLoadButton("Показать", loadTags));
    }
    return elem;
  }
  function createTagsContainer(userName, name, getter, autoload = false) {
    const elem = document.createElement("div");
    elem.classList.add("rpm-tags");
    const nameElem = document.createElement("h4");
    nameElem.textContent = name;
    const tagsList = createTagsSection(userName, getter, autoload);
    elem.append(nameElem, tagsList);
    return elem;
  }

  // src/features/mini-profile.ts
  async function requestCsrfToken() {
    if (appState.csrfToken !== null) return appState.csrfToken;
    const configElem = document.querySelector(".app__config");
    if (!configElem?.textContent) throw new Error("Pikabu config with the CSRF token was not found");
    appState.csrfToken = JSON.parse(configElem.textContent).csrfToken;
    return appState.csrfToken;
  }
  var newNotes = /* @__PURE__ */ new Map();
  var NOTE_PLACEHOLDER = "Заметка об этом пользователе будет видна только вам. Нажмите, чтобы ввести текст.";
  function handleMiniProfile(element) {
    if (element.hasAttribute("rpm-affected")) return;
    element.setAttribute("rpm-affected", "");
    const nameElem = element.querySelector(".pkb-profile-username h2");
    if (!nameElem?.textContent) return;
    const userId = parseInt(element.getAttribute("data-user-id"));
    const userName = nameElem.textContent.trim();
    if (GM_config.get("miniProfileOrientation") === "Горизонтально" /* HORIZONTAL */) {
      element.classList.add("rpm-mini-profile-horizontal");
    }
    function updateNoteElement() {
      let note = newNotes.get(userId);
      let noteHtml;
      const pkbNoteElem = element.querySelector(".mini-profile__note");
      if (pkbNoteElem) {
        if (note === void 0 || note === null) {
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
      const showNoteText = (text, html) => {
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
      const rpmPoweredElem = nodes_exports.createPoweredNote(
        "Улучшено с помощью Return Pikabu minus"
      );
      mainElem.append(rpmPoweredElem);
      function setTextareaActive(active) {
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
              Priority: "u=0"
            },
            body: `id=${userId}&action=${encodeURIComponent(
              action
            )}&message=${encodeURIComponent(noteToSave)}`
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
        const storyTagsElem = createTagsContainer(
          userName,
          "Теги постов",
          storyTagsGetter,
          GM_config.get("miniProfileAutoloadTags")
        );
        main.append(storyTagsElem);
        worked = true;
      }
      if (GM_config.get("miniProfileСommentTags")) {
        const commentsTagsElem = createTagsContainer(
          userName,
          "Теги комментариев",
          commentTagsGetter,
          GM_config.get("miniProfileAutoloadTags")
        );
        main.append(commentsTagsElem);
        worked = true;
      }
      if (GM_config.get("miniProfileСomments")) {
        const lastComments = createLastCommentsSection(
          userName,
          GM_config.get("miniProfileAutoloadComments"),
          GM_config.get("miniProfileAutoloadPikabuCommentCount"),
          true
        );
        main.append(lastComments);
        worked = true;
      }
      if (worked) {
        const poweredElem = nodes_exports.createPoweredNote(
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

  // src/features/links.ts
  var linkTypes = [
    // Telegram
    {
      domains: ["t.me"],
      iconHtml: `<svg xmlns="http://www.w3.org/2000/svg" class="rpm-story-icon icon icon--social__telegram"><use xlink:href="#icon--social__telegram"></use></svg>`,
      style: "fill: #24A1DE;"
    },
    // VK
    {
      domains: ["vk.com"],
      iconHtml: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--social__vk"><use xlink:href="#icon--social__vk"></use></svg>`,
      style: "fill: black;"
    },
    // TIKTOK
    {
      domains: ["tiktok.com"],
      iconHtml: `<svg class="icon" fill="#000000" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/></svg>`
    },
    // Boosty
    {
      domains: ["boosty.to"],
      iconHtml: `<svg class="icon" fill="#000000" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="50 50 217.4 197.4">
                <style type="text/css">
                  .st0{fill:#242B2C;}
                  .st1{fill:url(#SVGID_1_);}
                </style>
                <g id="sign">
                  <g id="b_1_">
                    <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="188.3014" y1="75.5591" x2="123.8106" y2="295.4895">
                      <stop offset="0" style="stop-color:#EF7829"/>
                      <stop offset="5.189538e-02" style="stop-color:#F07529"/>
                      <stop offset="0.3551" style="stop-color:#F0672B"/>
                      <stop offset="0.6673" style="stop-color:#F15E2C"/>
                      <stop offset="1" style="stop-color:#F15A2C"/>
                    </linearGradient>
                    <path class="st1" d="M87.5,163.9L120.2,51h50.1l-10.1,35c-0.1,0.2-0.2,0.4-0.3,0.6L133.3,179h24.8c-10.4,25.9-18.5,46.2-24.3,60.9    c-45.8-0.5-58.6-33.3-47.4-72.1 M133.9,240l60.4-86.9h-25.6l22.3-55.7c38.2,4,56.2,34.1,45.6,70.5C225.3,207,179.4,240,134.8,240    C134.5,240,134.2,240,133.9,240z"/>
                  </g>
                </g>
              </svg>`
    }
  ];
  async function checkStoryLinks(story) {
    function addIcon(linkType, element) {
      const elem = element.cloneNode();
      elem.innerHTML = linkType.iconHtml.trim();
      if (linkType.style) {
        elem.setAttribute("style", linkType.style);
      }
      elem.classList.add("rpm-story-icon");
      const titleElem = story.querySelector(".story__title");
      titleElem.prepend(elem);
    }
    const linkElems = Array.from(
      story.querySelectorAll(".story__content a")
    );
    linkElems.reverse();
    linkTypeFor: for (const linkType of linkTypes) {
      for (const domain of linkType.domains) {
        for (const linkElem of linkElems) {
          if (linkElem.href.includes(domain)) {
            addIcon(linkType, linkElem);
            continue linkTypeFor;
          }
        }
      }
    }
  }

  // src/features/videos.ts
  function processPostVideos(story) {
    function addButton(link, videoControls) {
      const a = document.createElement("a");
      a.classList.add("rpm-download-video-button");
      const name = link.split("/").pop();
      const extension = name.split(".").slice(1).join(".");
      if (extension) {
        a.setAttribute("download", "");
      }
      a.target = "_blank";
      a.href = link;
      a.textContent = extension || "Источник";
      videoControls.parentElement.insertBefore(a, videoControls.nextSibling);
    }
    const possibleAttributes = [
      "data-webm",
      "data-av1"
    ];
    const videos = story.querySelectorAll(".story-block_type_video");
    for (const videoElem of videos) {
      const player = videoElem.querySelector(".player");
      if (!player) continue;
      const type = player.getAttribute("data-type");
      if (type === "video") {
        const url = player.getAttribute("data-source");
        addButton(url, videoElem);
      } else if (type === "video-file") {
        const dataSource = player.getAttribute("data-source");
        if (dataSource) {
          addButton(dataSource + ".mp4", videoElem);
        }
        for (const attr of possibleAttributes) {
          if (player.hasAttribute(attr) && player.getAttribute(attr)) {
            addButton(player.getAttribute(attr), videoElem);
          }
        }
      }
    }
  }

  // src/features/stories.ts
  function removeStory(storyElem, reason, keepUser = false) {
    const titleElem = storyElem.querySelector(
      ".story__title a.story__title-link"
    );
    if (titleElem === null || storyElem.hasAttribute("rpm-deleted")) return;
    storyElem.setAttribute("rpm-deleted", "");
    const title = titleElem.textContent;
    const url = titleElem.href;
    const placeholder = document.createElement("div");
    placeholder.classList.add("rpm-placeholder");
    const textElem = document.createElement("div");
    textElem.classList.add("rpm-placeholder-text");
    const urlElem = document.createElement("a");
    urlElem.classList.add("rpm-placeholder-title");
    urlElem.textContent = title;
    urlElem.href = url;
    const reasonElem = document.createElement("span");
    reasonElem.classList.add("rpm-chip");
    reasonElem.textContent = `скрыт: ${reason}`;
    textElem.append(urlElem, reasonElem);
    placeholder.append(textElem);
    const userInfo = storyElem.querySelector(".story__user-info");
    if (keepUser && userInfo) {
      const userInfoContainer = document.createElement("div");
      userInfoContainer.append(userInfo.cloneNode(true));
      userInfoContainer.classList.add("rpm-user-info-container");
      for (const ratingElem of userInfoContainer.querySelectorAll(
        ".rpm-user-rating"
      )) {
        const uid = parseInt(ratingElem.getAttribute("pikabu-user-id"));
        ratingElem.replaceWith(nodes_exports.createUserRatingNode(uid, url));
      }
      placeholder.append(userInfoContainer);
    }
    storyElem.parentElement.insertBefore(placeholder, storyElem);
    const collapseButton = document.createElement("div");
    collapseButton.classList.add("collapse-button", "collapse-button_active");
    collapseButton.append(
      document.createElement("div"),
      document.createElement("div")
    );
    collapseButton.addEventListener("click", () => {
      if (collapseButton.classList.contains("collapse-button_active"))
        collapseButton.classList.remove("collapse-button_active");
      else collapseButton.classList.add("collapse-button_active");
    });
    placeholder.prepend(collapseButton);
  }
  var trackedLinkPattern = /pikabu.ru.+\?[ut]=(.+?)&[ut]=.+/i;
  function removeLinkTracker(link) {
    if (trackedLinkPattern.test(link.href)) {
      const realUrl = trackedLinkPattern.exec(link.href)[1];
      link.href = decodeURIComponent(realUrl);
    }
  }
  async function processStory(story) {
    if (story.hasAttribute("rpm-story-processed")) return;
    story.setAttribute("rpm-story-processed", "");
    if (GM_config.get("showBlockAuthorForeverButton")) {
      addBlockButton(story);
    }
    if (GM_config.get("socialLinks")) {
      checkStoryLinks(story);
    }
    if (GM_config.get("noLinkTracking")) {
      const links = story.querySelectorAll("a");
      links.forEach(removeLinkTracker);
    }
    if (appState.enableFilters && GM_config.get("blockPaidAuthors") && story.querySelector('.user__label[data-type="pikabu-plus"]') !== null) {
      removeStory(story, "подписка Пикабу+", true);
      info("Удалил пост", story, "как проплаченный");
    }
    if (GM_config.get("rpmEnabled")) {
      try {
        processStoryRpm(story).catch(error);
      } catch (e) {
        error(e);
      }
    }
    const rating = parseInt(story.getAttribute("data-rating"));
    if (appState.enableFilters && rating < GM_config.get("minStoryRating")) {
      removeStory(story, `рейтинг поста (${rating})`);
      info("Удалил пост", story, "по фильтру рейтинга");
    }
    if (GM_config.get("videoDownloadButtons"))
      processPostVideos(story);
    const ratingBlock = story.querySelector(".story__rating-block");
    if (!ratingBlock) return;
    const vid = story.getAttribute("data-vid");
    const authorId = parseInt(story.getAttribute("data-author-id"));
    const pluses = getRealRating(parseInt(ratingBlock.getAttribute("data-pluses")), vid, authorId);
    const minuses = getRealRating(parseInt(ratingBlock.getAttribute("data-minuses")), vid, authorId);
    const vote = parseInt(ratingBlock.getAttribute("data-vote") || "0");
    let onVoteCallback = null;
    if (GM_config.get("ratingBar") && pluses + minuses !== 0 && pluses + minuses >= GM_config.get("minRatesCountToShowRatingBar")) {
      const bar = addRatingBar(story, pluses / (pluses + minuses));
      onVoteCallback = (x, y) => {
        updateRatingBar(bar, x, y);
      };
    }
    replaceRating(ratingBlock.querySelector(".story__rating-count"), vote, pluses, minuses, false, onVoteCallback);
  }
  async function processStoryRpm(story) {
    const storyId = parseInt(story.getAttribute("data-story-id"));
    const uid = parseInt(story.getAttribute("data-author-id"));
    const userInfoRowElem = story.querySelector(
      ".story__community_after-author-panel, .story__user-info"
    );
    const footerElem = story.querySelector(
      ".story__footer-tools .story__comments-link.story__to-comments"
    );
    function ratingCallback(userInfo) {
      if (!appState.enableFilters) return;
      const rating = userInfo.base_rating + userInfo.pluses - userInfo.minuses + (userInfo.own_vote ?? 0);
      const ownVote = userInfo.own_vote ?? 0;
      if (ownVote === -1) {
        removeStory(
          story,
          userInfo.own_reason_text ?? `ваш минус пользователю в RPM`,
          true
        );
      } else if (rating < GM_config.get("rpmMinStoryRating") && ownVote != 1) {
        removeStory(story, `RPM-рейтинг (${rating})`, true);
      }
    }
    const elem = nodes_exports.createUserRatingNode(uid, `https://pikabu.ru/story/_${storyId}`, ratingCallback);
    if (userInfoRowElem) userInfoRowElem.prepend(elem);
    else if (footerElem?.parentElement) footerElem.parentElement.insertBefore(elem, footerElem);
    else return;
    if (GM_config.get("rpmStoryVoteReason")) {
      let info2 = null;
      try {
        info2 = await service_exports.getUserInfo(uid);
      } catch (e) {
        error(e);
      }
      if (info2?.own_reason_text) {
        const storyMain = story.querySelector(".story__main");
        storyMain.insertBefore(
          nodes_exports.createUserVoteReasonContainer(info2.own_reason_text),
          storyMain.querySelector(".story__content-wrapper")
        );
      }
    }
  }
  async function processStories(stories) {
    for (const story of stories) {
      processStory(story);
    }
  }

  // src/features/observer.ts
  function mutationsListener(mutationList, observer) {
    for (const mutation of mutationList) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.hasAttribute("rpm-observer-ignore")) continue;
          const selector = ".comment:not(.comment_deleted)";
          const owner = node.closest(selector);
          if (owner) handleComment(owner);
          node.querySelectorAll(selector).forEach(handleComment);
          if (node.matches("article.story")) {
            const storyElem = node;
            info("Поймал пост!", storyElem);
            processStory(storyElem);
          } else if (node.matches(".comment__more:not(.rpm-unroll-all)")) {
            commentMoreBtn();
          } else if (node.matches(".overlay")) {
            info("Поймал .overlay!");
            waitForElement(".theme-picker__popup, .mini-profile", 500, node).then(
              (e) => {
                if (e.matches(".mini-profile")) {
                  info("Поймал мини-профиль!", e);
                  handleMiniProfile(e);
                }
              },
              () => {
              }
            );
          } else if (node.matches(".mini-profile")) {
            handleMiniProfile(node);
          }
        }
      }
    }
  }

  // src/features/ui.ts
  function addSettingsOpenButton() {
    let block = (
      // mobile version
      document.querySelector(".footer__links .accordion") ?? // else PC version
      document.querySelector(".sidebar .sidebar__inner")
    );
    if (block === null) {
      error("Не удалось найти место для создания кнопки открытия настроек.");
      return;
    }
    const button = document.createElement("button");
    button.innerText = "Открыть настройки Return Pikabu minus";
    button.classList.add("rpm-open-settings-button");
    button.addEventListener("click", () => {
      button.disabled = true;
      GM_config.open();
      button.disabled = false;
    });
    block.appendChild(button);
  }
  async function processTabs() {
    const tabConfig = {
      hot: "hotTab",
      best: "bestTab",
      new: "newTab",
      my_lent: "subsTab",
      communities: "communitiesTab",
      companies: "blogsTab",
      experts: "expertsTab"
    };
    try {
      await waitForElement(".header-menu__item, .pkb-tab-list");
    } catch {
      return;
    }
    Object.entries(tabConfig).forEach(([key, field]) => {
      const selector = `.header-menu__item[data-feed-key="${key}"], .pkb-tab[data-feed-key="${key}"]`;
      if (!GM_config.get(field)) {
        const element = document.querySelector(selector);
        if (element) {
          element.remove();
        }
      }
    });
  }

  // src/styles/tokens.ts
  var TOKENS_STYLE = `
:root {
  --rpm-bg: var(--color-bright-800, #fff);
  --rpm-surface: var(--color-black-430, #f2f2f2);
  --rpm-border: var(--color-black-440, rgba(0, 0, 0, 0.1));
  --rpm-muted: var(--color-black-700, #777);
  --rpm-accent: var(--color-primary-700, #6cb33f);
  --rpm-accent-soft: var(--color-primary-200, #e3f2d9);
  --rpm-danger: var(--color-danger-800, #e5484d);
  --rpm-danger-soft: var(--color-danger-200, #fde3e3);
  --rpm-radius: 12px;
  --rpm-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
}

@keyframes rpm-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes rpm-pop-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes rpm-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .rpm-modal-overlay, .rpm-modal, .rpm-toast, .rpm-loading {
    animation: none !important;
    transition: none !important;
  }
}

/* Buttons */
button.rpm-btn,
a.rpm-btn {
  display: inline-block;
  box-sizing: border-box;
  margin: 0;
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  background: var(--rpm-surface);
  color: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition: filter 0.15s;
}
button.rpm-btn:hover,
a.rpm-btn:hover {
  filter: brightness(0.95);
}
button.rpm-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
button.rpm-btn-primary,
a.rpm-btn-primary {
  background: var(--rpm-accent);
  color: #fff;
  font-weight: 600;
}
button.rpm-btn:focus-visible {
  outline: 2px solid var(--rpm-accent);
  outline-offset: 2px;
}

/* Small chip, e.g. the reason a story was hidden */
.rpm-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--rpm-surface);
  color: var(--rpm-muted);
  font-size: 12.5px;
  line-height: 1.4;
}
`;

  // src/styles/toast.ts
  var TOAST_STYLE = `
.rpm-toasts {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 100001;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  width: min(320px, calc(100vw - 32px));
  pointer-events: none;
}
.rpm-toast {
  position: relative;
  box-sizing: border-box;
  padding: 12px 36px 12px 14px;
  border: 1px solid var(--rpm-border);
  border-left: 4px solid var(--rpm-accent);
  border-radius: 10px;
  background: var(--rpm-bg);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  font-size: 14px;
  line-height: 1.4;
  pointer-events: auto;
  cursor: pointer;
  animation: rpm-pop-in 0.25s ease-out;
  transition: opacity 0.25s, transform 0.25s;
}
.rpm-toast.rpm-leaving {
  opacity: 0;
  transform: translateX(-12px);
}
.rpm-toast-error {
  border-left-color: var(--rpm-danger);
}
.rpm-toast-title {
  font-weight: 700;
}
.rpm-toast-body {
  margin-top: 2px;
  color: var(--rpm-muted);
  overflow-wrap: anywhere;
}
.rpm-toast-body a {
  color: var(--rpm-accent);
}
.rpm-toast-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--rpm-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.rpm-toast-close:hover {
  background: var(--rpm-surface);
}
`;

  // src/styles/modal.ts
  var MODAL_STYLE = `
.rpm-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
  animation: rpm-fade-in 0.15s ease-out;
  outline: none;
}
.rpm-modal {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 440px;
  max-height: min(640px, 100%);
  overflow: hidden;
  border-radius: 16px;
  background: var(--rpm-bg);
  box-shadow: var(--rpm-shadow);
  font-size: 14px;
  line-height: 1.4;
  animation: rpm-pop-in 0.2s ease-out;
}
.rpm-modal-header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 12px 8px 20px;
  font-size: 18px;
  font-weight: 700;
}
button.rpm-modal-close {
  flex: none;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--rpm-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
button.rpm-modal-close:hover {
  background: var(--rpm-surface);
}
.rpm-modal-body {
  min-height: 0;
  margin: 0;
  padding: 4px 20px 16px;
  overflow-y: auto;
}
.rpm-modal-footer {
  display: flex;
  flex: none;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--rpm-border);
}

/* Reason picker */
.rpm-reason-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rpm-reason-option {
  padding: 10px 12px;
  border: 1px solid var(--rpm-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.rpm-reason-option:hover {
  background: var(--rpm-surface);
}
.rpm-reason-option:has(input[type="radio"]:checked) {
  border-color: var(--rpm-accent);
  background: var(--rpm-accent-soft);
}
.rpm-reason-option label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.rpm-reason-option input[type="radio"] {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--rpm-accent);
}
input.rpm-reason-input {
  box-sizing: border-box;
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--rpm-border);
  border-radius: 8px;
  background: var(--rpm-bg);
  color: inherit;
  font-size: 14px;
}
input.rpm-reason-input:focus {
  border-color: var(--rpm-accent);
  outline: none;
}

/* Votes list */
.rpm-votes-message {
  padding: 24px 0;
  color: var(--rpm-muted);
  text-align: center;
}
.rpm-vote-entry {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--rpm-border);
  overflow-wrap: anywhere;
}
.rpm-vote-entry:last-child {
  border-bottom: none;
}
.rpm-vote-sign {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
.rpm-vote-plus .rpm-vote-sign {
  background: var(--rpm-accent-soft);
  color: var(--rpm-accent);
}
.rpm-vote-minus .rpm-vote-sign {
  background: var(--rpm-danger-soft);
  color: var(--rpm-danger);
}
.rpm-vote-main {
  min-width: 0;
}
.rpm-vote-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
}
.rpm-user {
  font-weight: 600;
}
.rpm-vote-time {
  color: var(--rpm-muted);
  font-size: 12.5px;
}
.rpm-vote-text {
  margin-top: 2px;
}
.rpm-vote-link {
  display: inline-block;
  margin-top: 2px;
  color: var(--rpm-accent);
  font-size: 12.5px;
}
`;

  // src/styles/rpm.ts
  var RPM_STYLE = `
/* Author rating badge */
.rpm-user-rating {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  box-sizing: border-box;
  padding: 2px;
  border-radius: 999px;
  background: var(--color-black-alpha-005, rgba(0, 0, 0, 0.05));
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  vertical-align: middle;
  user-select: none;
}
.rpm-user-rating span {
  display: inline-block;
  text-align: center;
}
.rpm-user-rating .rpm-pluses,
.rpm-user-rating .rpm-minuses {
  padding: 5px 8px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.rpm-pluses {
  color: var(--rpm-accent);
}
.rpm-minuses {
  color: var(--rpm-danger);
}
.rpm-pluses::before {
  content: "+";
}
.rpm-minuses::before {
  content: "\\2212";
}
.rpm-user-rating .rpm-pluses:hover {
  background: var(--rpm-accent-soft);
}
.rpm-user-rating .rpm-minuses:hover {
  background: var(--rpm-danger-soft);
}
.rpm-user-rating .rpm-rating {
  padding: 0 4px;
  font-weight: 700;
}
.rpm-user-rating[rpm-own-vote="1"] .rpm-pluses {
  background: var(--rpm-accent);
  color: #fff;
}
.rpm-user-rating[rpm-own-vote="-1"] .rpm-minuses {
  background: var(--rpm-danger);
  color: #fff;
}
.rpm-user-rating .rpm-more-votes {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--rpm-muted);
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.15s, background-color 0.15s;
}
.rpm-user-rating .rpm-more-votes:hover {
  background: var(--rpm-surface);
  opacity: 1;
}
.rpm-user-rating .rpm-more-votes svg {
  width: 14px;
  height: 14px;
}
.story__user-info .rpm-user-rating,
.story__main .rpm-user-rating {
  margin-right: 10px;
}
.comment__header .rpm-user-rating {
  margin-left: auto;
}
.rpm-user-rating + .comment__right {
  margin-left: unset;
}

/* Loading skeleton (replaced by the numbers, removed if RPM is unavailable) */
.rpm-user-rating:has(.rpm-loading) {
  padding: 0;
}
.rpm-loading {
  display: block;
  width: 96px;
  height: 26px;
  margin: 0;
  border-radius: 999px;
  background: linear-gradient(
      90deg,
      transparent 25%,
      rgba(128, 128, 128, 0.25) 50%,
      transparent 75%
    )
    0 0 / 200% 100%;
  animation: rpm-shimmer 1.2s linear infinite;
}

/* Note with the reason of your own vote */
.rpm-vote-reason-container {
  margin: 8px 16px;
  padding: 10px 14px;
  border-left: 4px solid var(--rpm-accent);
  border-radius: 10px;
  background: var(--rpm-surface);
  font-size: 14px;
  line-height: 1.4;
}
.rpm-vote-reason-title {
  margin: 0 0 2px;
  color: var(--rpm-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.rpm-vote-reason {
  margin: 0;
  font-weight: 400;
}

/* Placeholder that replaces a hidden story */
.rpm-placeholder {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 6px 12px;
  box-sizing: border-box;
  width: 100%;
  margin: 20px 0 0;
  padding: 8px 14px 8px 8px;
  border: 1px solid var(--rpm-border);
  border-radius: var(--rpm-radius);
  background: var(--rpm-bg);
  font-size: 14px;
  text-align: left;
}
.rpm-placeholder .collapse-button {
  position: relative;
  left: auto;
  top: auto;
  margin: 0;
  translate: none;
  grid-column: 1;
  grid-row: 1;
}
.rpm-placeholder:has(.rpm-user-info-container) .collapse-button {
  grid-row: 1 / span 2;
}
.rpm-placeholder-text {
  display: flex;
  grid-column: 2;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
}
.rpm-placeholder-title {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rpm-placeholder-text .rpm-chip {
  flex: none;
}
.rpm-placeholder .rpm-user-info-container {
  grid-column: 2;
  min-width: 0;
}
.rpm-placeholder .rpm-user-info-container .story__user-info {
  flex-wrap: wrap;
  row-gap: 4px;
}
.rpm-placeholder .rpm-user-rating {
  margin-right: 0;
}
.rpm-placeholder:has(.collapse-button_active) + article {
  display: none;
}
.mv .rpm-placeholder {
  font-size: 13px;
}
`;

  // src/styles/rating.ts
  var RATING_STYLE = `
.story__footer .story__rating-up {
  margin-right: 5px !important;
}
.story__rating-count {
  margin: 7px 0;
}
.comment__rating-down .comment__rating-count {
  margin-right: 8px;
}
.comment__rating-down,
.comment__rating-up {
  padding: 4px;
}

/* Plus / minus counters next to the summary rating */
.rpm-new-rating-counter {
  color: var(--rating-text);
  font-size: 1em;
}
.story__rating-block .rpm-new-rating-counter {
  font: var(--rating-textCounter);
}
.comment__rating .rpm-new-rating-counter {
  margin: 0 4px;
  font: var(--s-text-label-main-typRegular-style) var(--s-text-label-main-typRegular-weight) var(--s-text-label-main-size)/var(--s-text-label-main-lh) var(--s-text-label-main-font);
}
.rpm-new-rating-counter.rpm-counter-plus {
  color: var(--rpm-accent);
}
.rpm-new-rating-counter.rpm-counter-minus {
  color: var(--rpm-danger);
}

/* Plus/minus ratio bar */
.rpm-rating-bar {
  position: absolute;
  top: 5%;
  right: -9.5px;
  width: 4px;
  height: 90%;
  overflow: hidden;
  border-radius: 4px;
  background: var(--rpm-danger);
}
.rpm-rating-bar-inner {
  border-radius: 4px;
  background: var(--rpm-accent);
  transition: height ease-in-out 0.5s;
}
.comment__body {
  position: relative;
}
.comment .rpm-rating-bar {
  top: 15px;
  left: -10px;
  height: 70px;
}
`;

  // src/styles/misc.ts
  var MISC_STYLE = `
/* Block author forever */
.rpm-block-author {
  display: flex;
  align-items: center;
  margin-right: 24px;
  padding: 0;
  overflow: hidden;
  background: none;
  cursor: pointer;
}
.rpm-block-author:hover * {
  fill: var(--rpm-danger);
}
.story__footer-tools-inner .rpm-block-author {
  margin-right: auto;
  margin-left: 8px;
  overflow: visible;
  transform: scale(1.3);
}

/* Video source links */
.rpm-download-video-button {
  display: inline-block;
  margin-left: 15px;
}

/* Social icons in story titles */
.rpm-story-icon {
  width: 24px;
  height: 24px;
  margin-right: 6px;
  padding: 0 4px;
  border-radius: 3px;
  vertical-align: text-top;
}
.rpm-story-icon svg {
  width: 16px;
  height: 16px;
  margin: 0;
  padding: 2px 0;
  transition: all ease 300ms;
}
.rpm-story-icon:hover svg {
  width: 18px;
  height: 18px;
}

/* Settings entry point on the mobile site */
.rpm-open-settings-button {
  width: 100%;
  margin-top: 10px;
  font-size: 0.9em;
  text-align: center;
}

/* "Unroll all comments" button */
.comment__more:has(+ .rpm-unroll-all),
.rpm-unroll-all {
  --gap: 10px;
  width: calc(50% - var(--gap) / 2);
  margin-right: var(--gap);
  text-align: center;
}
.rpm-unroll-all {
  display: none;
  margin: auto 0;
  background-color: var(--rpm-accent);
  color: #fff;
}
.comment__more + .rpm-unroll-all {
  display: inline-block;
}
`;

  // src/styles/profile.ts
  var PROFILE_STYLE = `
.mini-profile[rpm-affected] {
  width: 400px;
}
/* Private note */
.rpm-mini-profile-note {
  resize: none;
}
.rpm-mini-profile-note-display {
  display: block;
  min-height: 1.4em;
  cursor: text;
  overflow-wrap: anywhere;
}
.rpm-mini-profile-note-display.rpm-note-empty {
  color: var(--rpm-muted);
  font-size: 0.9em;
}
.rpm-powered {
  display: inline-block;
  width: 100%;
  font-size: 0.8em;
  opacity: 0.8;
  text-align: right;
}

/* Gollum statistics */
.rpm-gollum-stats {
  box-sizing: border-box;
  width: 100%;
  padding: 15px;
}
.rpm-gollum-stats > * {
  margin-bottom: 14px;
}
.rpm-gollum-stats > *:last-child {
  margin-bottom: 0;
}
.rpm-tags h4,
.rpm-last-comments > h4 {
  margin: 0 0 6px;
  color: var(--rpm-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.rpm-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.8rem;
}
.rpm-tags-tag {
  padding: 0.1em 0.7em;
  border-radius: 999px;
  background: var(--rpm-accent-soft);
}

/* Empty / failed states and small buttons */
.rpm-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  color: var(--rpm-muted);
  font-size: 0.9em;
}
button.rpm-btn-small {
  padding: 5px 12px;
  font-size: 13px;
}
.rpm-last-comments > button.rpm-btn {
  display: block;
  width: 100%;
  text-align: center;
}

/* Last comments from Gollum */
.rpm-last-comments-container {
  height: max-content;
  max-height: 400px;
  margin-bottom: 10px;
  overflow-y: auto;
  border-radius: var(--rpm-radius);
  resize: vertical;
}
section .rpm-last-comments-container {
  max-height: unset;
}
.rpm-comment-no-js .comment__tools,
.rpm-comment-no-js .comment__controls,
.rpm-comment-no-js .comment-hidden-group {
  display: none;
}
.rpm-comment-container {
  margin-bottom: 7px;
  padding: 6px 1em;
  overflow: hidden;
  border-radius: var(--rpm-radius);
  background: var(--rpm-surface);
}
.rpm-comment-container > a {
  display: block;
  width: 100%;
  margin-bottom: 5px;
  text-align: center;
}
.rpm-comment-container .comment__tools > *:not([data-role="link"]) {
  display: none;
}
.rpm-comment-container > .comment,
.rpm-comment-container > .comments {
  padding: 5px 5px 0;
  border-radius: var(--rpm-radius);
  background: var(--rpm-bg);
}
.rpm-comment-preview {
  text-align: center;
}
.rpm-highlight-comment > .comment__body {
  padding: 5px;
  border: 3px dotted var(--rpm-accent);
  border-radius: 10px;
}

/* Two-column mini-profile (declared last: it must win over the generic widths above) */
.mini-profile.rpm-mini-profile-horizontal {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  max-height: 450px;
  min-width: 700px;
  max-width: 700px;
}
.mini-profile.rpm-mini-profile-horizontal > * {
  width: 50%;
}
`;

  // src/styles/themes.ts
  var THEMES_STYLE = `
.rpm-theme-picker {
  flex: 1 0 0px;
}
.rpm-theme-picker:after {
  content: attr(data-name)
}
.theme-picker__buttons {
  flex-wrap: wrap;
  flex-direction: row;
  gap: 10px;
  justify-content: center;
}
.theme-picker__button {
  min-width: fit-content;
  max-width: max-content;
}
.theme-picker__button[data-type="default"] {
  max-width: unset;
  width: 35px;
}  /* SUNSET GLOW */
.rpm-theme-picker[data-type="sunset-glow"] {
  background: linear-gradient(135deg, #6b1d52, #b02e78, #f77fba);
  border: 2px solid #8e2465;
  border-radius: 8px;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="sunset-glow"]:hover {
  transform: scale(1.1);
}
html[data-theme="sunset-glow"] {
  --color-primary-900: #6b1d52;
  --color-primary-800: #8e2465;
  --color-primary-700: #b02e78;
  --color-primary-500: #d14791;
  --color-primary-400: #f77fba;
  --color-primary-200: #fbc8e4;
  --color-primary-100: #fdeaf4;
}  /* OCEAN BREEZE */
.rpm-theme-picker[data-type="ocean-breeze"] {
  background: linear-gradient(135deg, #012a4a, #014f86, #61a5c2);
  border: 2px solid #013a63;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="ocean-breeze"]:hover {
  transform: scale(1.1);
}
html[data-theme="ocean-breeze"] {
  --color-primary-900: #012a4a;
  --color-primary-800: #013a63;
  --color-primary-700: #014f86;
  --color-primary-500: #2a6f97;
  --color-primary-400: #61a5c2;
  --color-primary-200: #a9d6e5;
  --color-primary-100: #d9f1f6;
}  /* FOREST */
.rpm-theme-picker[data-type="forest-whisper"] {
  background: linear-gradient(135deg, #143601, #275d03, #63b530);
  border: 2px solid #1c4a02;
  border-radius: 8px;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="forest-whisper"]:hover {
  transform: scale(1.1);
}
html[data-theme="forest-whisper"] {
  --color-primary-900:rgb(27, 68, 3);
  --color-primary-800:rgb(32, 80, 4);
  --color-primary-700:rgb(72, 170, 7);
  --color-primary-500: #398d05;
  --color-primary-400: #63b530;
  --color-primary-200: #a9e8a4;
  --color-primary-100:rgb(227, 248, 227);
}  /* LAVENDER DREAMS */
.rpm-theme-picker[data-type="lavender-dreams"] {
  background: linear-gradient(135deg, #4c1d6f, #70308e, #cfa5e0);
  border: 2px solid #5e267e;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="lavender-dreams"]:hover {
  transform: scale(1.1);
}
html[data-theme="lavender-dreams"] {
  --color-primary-900:rgb(141, 92, 179);
  --color-primary-800:rgb(117, 57, 151);
  --color-primary-700:rgb(132, 73, 160);
  --color-primary-500: #9b5cb2;
  --color-primary-400: #cfa5e0;
  --color-primary-200:rgb(236, 223, 245);
  --color-primary-100: #f7ecfc;
}  /* FIRE EMBER */
.rpm-theme-picker[data-type="fire-ember"] {
  background: linear-gradient(135deg, #7f1d1d, #b91c1c, #f87171);
  border: 2px solid #991b1b;
  border-radius: 8px;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="fire-ember"]:hover {
  transform: scale(1.1);
}
html[data-theme="fire-ember"] {
  --color-primary-900:rgb(145, 42, 42);
  --color-primary-800:rgb(172, 42, 42);
  --color-primary-700:rgb(211, 32, 32);
  --color-primary-500:rgb(241, 62, 62);
  --color-primary-400:rgb(252, 138, 138);
  --color-primary-200:rgb(253, 185, 185);
  --color-primary-100: #fee2e2;
}  /* POLKA (mosaic before) */
html[data-theme="mosaic"] .app {
  background-image:  radial-gradient(rgba(68, 77, 247, 0.5) 1.3px, transparent 1.3px), radial-gradient(rgba(68, 77, 247, 0.5) 1.3px, transparent 1.3px);
  background-repeat: repeat;
  background-size: 66px 66px;
  background-position: 0 0, 33px 33px;
}
.rpm-theme-picker[data-type="mosaic"] {
  background-image:  radial-gradient(rgba(68, 77, 247, 0.5) 1.3px, transparent 1.3px), radial-gradient(rgba(68, 77, 247, 0.5) 1.3px, rgba(0, 0, 0, 0.1) 1.3px);
  background-repeat: repeat;
  background-size: 10px 10px;
  background-position: 0 0, 5px 5px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.rpm-theme-picker[data-type="mosaic"]:after {
  color: var(--color-black-800);
}
.rpm-theme-picker[data-type="mosaic"]:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}  /* WHITE TEXT */
html[data-theme="lavender-dreams"] .achievements-progress__bar,
html[data-theme="fire-ember"] .achievements-progress__bar,
html[data-theme="forest-whisper"] .achievements-progress__bar,
html[data-theme="ocean-breeze"] .achievements-progress__bar,
html[data-theme="sunset-glow"] .achievements-progress__bar {
  color: white;
}
`;

  // src/config/settings-styles.ts
  var SETTINGS_STYLE = `
#prm {
  position: fixed !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  border: none !important;
  border-radius: 0 !important;
  background: rgba(0, 0, 0, 0.55) !important;
  padding: 24px 16px;
  box-sizing: border-box;
  overflow: hidden;
  outline: none;
}
#prm [hidden] {
  display: none !important;
}
#prm_wrapper {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-width: 980px;
  height: min(780px, 100%);
  margin: 0 auto;
  padding: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--rpm-bg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
}

/* Header */
#prm .rpm-header {
  text-align: left;
  display: flex;
  flex: none;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  height: auto;
  padding: 16px 24px;
  border-bottom: 1px solid var(--rpm-border);
}
#prm .rpm-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}
#prm .rpm-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 2px;
}
#prm .rpm-links a {
  margin: 0;
  font-size: 13px;
  color: var(--rpm-accent);
  text-decoration: none;
}
#prm .rpm-links a:hover {
  text-decoration: underline;
}
#prm input.rpm-search {
  box-sizing: border-box;
  width: 240px;
  max-width: 100%;
  margin: 0 0 0 auto;
  padding: 8px 12px;
  border: 1px solid var(--rpm-border);
  border-radius: 8px;
  background: var(--rpm-surface);
  color: inherit;
  font-size: 14px;
}

/* Navigation + content */
#prm .rpm-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
#prm .rpm-nav {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 2px;
  width: 200px;
  padding: 12px;
  overflow-y: auto;
  border-right: 1px solid var(--rpm-border);
}
#prm .rpm-nav-item {
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: none;
  color: inherit;
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}
#prm .rpm-nav-item:hover {
  background: var(--rpm-surface);
}
#prm .rpm-nav-item.rpm-active {
  background: var(--rpm-accent);
  color: #fff;
  font-weight: 600;
}
#prm .rpm-content {
  flex: 1;
  min-width: 0;
  padding: 8px 28px 28px;
  overflow-y: auto;
}
#prm .rpm-panel {
  display: block;
  margin: 0 0 12px;
  padding: 0;
  overflow: visible;
  border-radius: 0;
  background: none;
}
#prm .rpm-panel-head {
  padding: 16px 0 4px;
}
#prm .rpm-panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
#prm .rpm-panel-desc {
  margin: 4px 0 0;
  color: var(--rpm-muted);
  font-size: 13px;
}
#prm .rpm-searching .rpm-panel-head {
  padding-top: 20px;
}
#prm .rpm-empty {
  padding: 48px 0;
  color: var(--rpm-muted);
  text-align: center;
}

/* Rows */
#prm .rpm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 20px;
  width: auto;
  margin: 0;
  padding: 12px 0;
  border-bottom: 1px solid var(--rpm-border);
  font-size: 14px;
}
#prm .rpm-row-checkbox {
  cursor: pointer;
}
#prm .rpm-row-label {
  flex: 1;
  min-width: 0;
}
#prm .rpm-row-title {
  display: block;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
#prm .rpm-row-checkbox .rpm-row-title {
  cursor: pointer;
}
#prm .rpm-row-desc {
  margin-top: 2px;
  color: var(--rpm-muted);
  font-size: 12.5px;
  overflow-wrap: anywhere;
}
#prm .rpm-row-control {
  display: flex;
  flex: none;
  align-items: center;
}
#prm .rpm-row-error {
  flex-basis: 100%;
  color: var(--rpm-danger);
  font-size: 12px;
}

/* Text fields stack: title on top, input below */
#prm .rpm-row.rpm-row-text {
  flex-wrap: wrap;
}
#prm .rpm-row.rpm-row-text .rpm-row-control {
  flex: 1 0 100%;
}

/* Controls */
#prm .rpm-row input[type="text"],
#prm .rpm-row select {
  box-sizing: border-box;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--rpm-border);
  border-radius: 8px;
  background: var(--rpm-surface);
  color: inherit;
  font-size: 14px;
  line-height: 1.2;
}
#prm .rpm-row-int input[type="text"],
#prm .rpm-row-number input[type="text"] {
  width: 96px;
  text-align: right;
}
#prm .rpm-row-text input[type="text"] {
  width: 100%;
}
#prm .rpm-row input[type="text"]:focus,
#prm .rpm-row select:focus,
#prm input.rpm-search:focus {
  border-color: var(--rpm-accent);
  outline: none;
}
#prm .rpm-row input[type="text"].rpm-invalid,
#prm .rpm-row input[type="text"].rpm-invalid:focus {
  border-color: var(--rpm-danger);
}
#prm .rpm-row-button button,
#prm .rpm-row input[type="button"] {
  margin: 0;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: var(--rpm-accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Switch */
#prm .rpm-row-checkbox input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  flex: none;
  width: 42px;
  height: 24px;
  margin: 0;
  border: none;
  border-radius: 12px;
  background: var(--color-black-500, #c8c8c8);
  cursor: pointer;
  transition: background-color 0.2s;
}
#prm .rpm-row-checkbox input[type="checkbox"]::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}
#prm .rpm-row-checkbox input[type="checkbox"]:checked {
  background: var(--rpm-accent);
}
#prm .rpm-row-checkbox input[type="checkbox"]:checked::after {
  transform: translateX(18px);
}
#prm .rpm-row-checkbox input[type="checkbox"]:focus-visible,
#prm .rpm-nav-item:focus-visible {
  outline: 2px solid var(--rpm-accent);
  outline-offset: 2px;
}

/* Footer */
#prm .rpm-footer {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border-top: 1px solid var(--rpm-border);
}
#prm .rpm-reset {
  margin-right: auto;
  color: var(--rpm-muted);
  font-size: 12.5px;
}
#prm .rpm-dirty {
  color: #d98a00;
  font-size: 12.5px;
}

@media only screen and (max-width: 768px) {
  #prm {
    padding: 0;
  }
  #prm_wrapper {
    height: 100%;
    border-radius: 0;
  }
  #prm .rpm-header {
    padding: 12px 16px;
  }
  #prm input.rpm-search {
    width: 100%;
    margin: 0;
  }
  #prm .rpm-body {
    flex-direction: column;
  }
  #prm .rpm-nav {
    flex-direction: row;
    width: auto;
    padding: 8px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid var(--rpm-border);
  }
  #prm .rpm-nav-item {
    width: auto;
    white-space: nowrap;
  }
  #prm .rpm-content {
    padding: 4px 16px 20px;
  }
  #prm .rpm-footer {
    flex-wrap: wrap;
    padding: 12px 16px;
  }
  #prm .rpm-reset {
    flex-basis: 100%;
    margin: 0;
  }
}
`;

  // src/styles/index.ts
  var STYLES = [
    TOKENS_STYLE,
    RATING_STYLE,
    RPM_STYLE,
    TOAST_STYLE,
    MODAL_STYLE,
    MISC_STYLE,
    PROFILE_STYLE,
    THEMES_STYLE,
    SETTINGS_STYLE
  ].join("\n");

  // src/main.ts
  var supportMenuCommands = GM.registerMenuCommand !== void 0;
  function init() {
    addCss(STYLES);
    appState.observer = new MutationObserver(mutationsListener);
    appState.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
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
  function unrollComments(button, attemptsLeft = 100) {
    if (attemptsLeft <= 0 || button.disabled) return;
    button.click();
    setTimeout(() => {
      if (document.body.contains(button)) {
        unrollComments(button, attemptsLeft - 1);
      }
    }, 500);
  }
  function commentMoreBtn() {
    const value = GM_config.get("unrollCommentaries");
    if (value === "Стандартная пикабушная кнопка" /* NONE */) return;
    const moreButton = document.querySelector(
      ".comment__more"
    );
    if (!moreButton) return;
    if (value === 'Дополнительная кнопка "Раскрыть всё"' /* UNROLL_ALL_BUTTON */) {
      if (moreButton.parentElement.querySelector(".rpm-unroll-all")) return;
      const btn = document.createElement("button");
      btn.textContent = "Раскрыть все комментарии";
      btn.classList.add("rpm-unroll-all");
      btn.addEventListener("click", () => {
        btn.remove();
        unrollComments(moreButton);
      });
      moreButton.parentElement.append(btn);
    } else if (value === "Автоматическая раскрутка всех комментариев" /* AUTO_UNROLL */) {
      unrollComments(moreButton);
    }
  }
  var DISCLAIMER = `
Пользуясь данным скриптом и его функциями, вы соглашаетесь с <a href="https://rpm.pyxiion.ru/terms">пользовательским соглашением и политикой конфиденциальности</a>.
Данное сообщение появится всего три раза.
`.trim();
  function usageDisclaimer() {
    let count = parseInt(localStorage.getItem("rpm-disclaimer") ?? "3");
    if (count > 0) {
      sendNotification("Условия пользования", DISCLAIMER, 1e4, true);
      localStorage.setItem("rpm-disclaimer", (count - 1).toString());
    }
  }
  async function onLoad() {
    usageDisclaimer();
    processStories(document.querySelectorAll("article.story"));
    commentMoreBtn();
    if (!supportMenuCommands) addSettingsOpenButton();
    for (const comment of document.querySelectorAll(".comment")) {
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
    if (GM_config.get("profileStoryTags")) {
      const section = document.createElement("section");
      section.append(
        createTagsContainer(
          userName,
          "Теги постов",
          storyTagsGetter,
          true
        )
      );
      feedPanel.parentElement.insertBefore(section, feedPanel);
      lastSection = section;
    }
    if (GM_config.get("profileСommentTags")) {
      const section = document.createElement("section");
      section.append(
        createTagsContainer(
          userName,
          "Теги комментариев",
          commentTagsGetter,
          true
        )
      );
      feedPanel.parentElement.insertBefore(section, feedPanel);
      lastSection = section;
    }
    if (GM_config.get("profileСomments")) {
      const section = document.createElement("section");
      section.append(
        createLastCommentsSection(
          userName,
          GM_config.get("profileAutoloadComments"),
          GM_config.get("profileAutoloadPikabuCommentCount")
        )
      );
      feedPanel.parentElement.insertBefore(section, feedPanel);
      lastSection = section;
    }
    if (lastSection !== null) {
      const poweredElem = nodes_exports.createPoweredNote(
        `Данные получены с <a href="https://gollum.space/user/${userName.replace(/\./g, "_")}-summary" target="_blank">gollum.space</a>`
      );
      const rpmPoweredElem = nodes_exports.createPoweredNote(
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
})();
