// ==UserScript==
// @name         Return Pikabu minus
// @version      0.5.9
// @namespace    pikabu-return-minus.pyxiion.ru
// @description  Возвращает минусы на Pikabu, а также фильтрацию по рейтингу.
// @author       PyXiion
// @match        *://pikabu.ru/*
// @connect      api.pikabu.ru
// @connect      pikabu.ru
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @require      https://greasyfork.org/scripts/452219-md5-%E5%87%BD%E6%95%B0/code/MD5%20%E5%87%BD%E6%95%B0.js?version=1099124
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @license      MIT
// ==/UserScript==

//#region Networking

type HttpMethod = "POST" | "GET";

interface HttpRequestCallback {
  onError(response: GM.Response<undefined>): void;
  onSuccess(response: GM.Response<undefined>): void;
}

class HttpRequest {
  protected headers: Map<string, string>;
  protected httpMethod: HttpMethod;
  protected url: string;
  protected timeout: number;

  public constructor(url: string) {
    this.url = url;
    this.httpMethod = "POST";
    this.headers = new Map<string, string>();
    this.timeout = 15000;
  }

  public addHeader(key: string, value: string) {
    this.headers.set(key, value);
    return this;
  }
  public setHttpMethod(httpMethod: HttpMethod) {
    this.httpMethod = httpMethod;
    return this;
  }

  // virtual
  protected getData(): any {
    return {};
  }

  public execute(callback: HttpRequestCallback) {
    const details: GM.Request<undefined> = {
      url: this.url,
      method: this.httpMethod,
      headers: Object.fromEntries(this.headers),
      data: JSON.stringify(this.getData()),
      timeout: this.timeout,
      responseType: "json",

      onerror: callback.onError,
      onload: callback.onSuccess,
      // TODO: ontimeout
    };

    (details as any).anonymous = true;

    GM.xmlHttpRequest(details);
  }

  public executeAsync() {
    return new Promise<GM.Response<undefined>>((resolve, reject) => {
      this.execute({
        onError: reject,
        onSuccess: resolve,
      });
    });
  }
}

//#endregion

//#region Pikabu API

namespace Pikabu {
  const DOMAIN = "https://api.pikabu.ru/";
  const API_V1 = DOMAIN + "v1/";
  const API_KEY = "kmq4!2cPl)peZ";

  type PikabuController = "story.get";

  class API {
    static readonly USER_AGENT =
      "ru.pikabu.android/1.21.15 (SM-N975F Android 7.1.2)";
    static readonly COOKIE =
      "unqKms867=aba48a160c; rm5bH=8c68fbfe3dc5e5f5b23a9ec1a8f784f8";

    public static getDeviceId(): string {
      return "0";
    }
  }

  class Request extends HttpRequest {
    private controller: PikabuController;
    private params: PikabuJson.RequestParams;

    public constructor(
      domain: string,
      controller: PikabuController,
      params?: PikabuJson.RequestParams
    ) {
      super(domain + controller);
      this.controller = controller;

      this.params = params;

      this.setHttpMethod("GET");
      this.addHeader("DeviceId", API.getDeviceId());
      this.addHeader("User-Agent", API.USER_AGENT);
      this.addHeader("Cookie", API.COOKIE);
      this.addHeader("Content-Type", "application/json");
    }

    public setParam(key: string, value: string | number) {
      this.params[key] = value;
    }

    private static getHash(
      data: PikabuJson.RequestParams,
      controller: string,
      ms: number
    ) {
      const join = Object.values(data).sort().join(",");
      const toHash = [API_KEY, controller, ms, join].join(",");
      const hashed = MD5(toHash);
      return btoa(hashed);
    }

    protected override getData(): any {
      const ms = Date.now();
      const data = {
        new_sort: 1,
        ...this.params,
      };

      return {
        ...data,
        id: "iws",
        hash: Request.getHash(data, this.controller, ms),
        token: ms,
      };
    }

    public async executeAsync(): Promise<any> {
      const response = await super.executeAsync();
      const data: PikabuJson.Response = response.response;

      if (!("response" in data)) {
        throw new Error(data?.error?.message ?? "Unknown error");
      }

      return data.response;
    }
  }

  class PostRequest extends Request {
    public constructor(
      controller: PikabuController,
      params?: PikabuJson.RequestParams
    ) {
      super(API_V1, controller, params);
      this.setHttpMethod("POST");
    }
  }

  export class RatingObject {
    public id: number;
    public rating: number;
    public pluses: number;
    public minuses: number;
  }

  export class Post extends RatingObject {
    public videos = [];

    public constructor(payload: PikabuJson.Story) {
      super();
      this.id = payload.story_id;
      this.rating = payload.story_digs ?? 0;
      this.pluses = payload.story_pluses ?? 0;
      this.minuses = payload.story_minuses ?? 0;

      // if (payload.)
    }
  }

  export class Comment extends RatingObject {
    public parentId: number;

    public constructor(payload: PikabuJson.Comment) {
      super();
      this.id = payload.comment_id;
      this.parentId = payload.parent_id;
      this.rating = payload.comment_rating ?? 0;
      this.pluses = payload.comment_pluses ?? 0;
      this.minuses = payload.comment_minuses ?? 0;
    }
  }

  export class StoryData {
    public story: Post;

    public constructor(payload: PikabuJson.StoryGetResponse) {
      this.story = "story" in payload ? new Post(payload.story) : null;
    }
  }
  export class CommentsData extends StoryData {
    public comments: Comment[];
    public selectedCommentId: number;

    public constructor(payload: PikabuJson.StoryGetResponse) {
      super(payload);

      this.selectedCommentId = 0;
      this.comments = payload.comments.map((x) => new Comment(x));
    }
  }

  export namespace DataService {
    export async function fetchStory(
      storyId: number,
      commentsPage: number
    ): Promise<CommentsData> {
      const params: PikabuJson.RequestParamsGetStory = {
        story_id: storyId,
        page: commentsPage,
      };

      try {
        const request = new PostRequest("story.get", params);
        const payload =
          (await request.executeAsync()) as PikabuJson.StoryGetResponse;

        const commentsData = new CommentsData(payload);

        return commentsData;
      } catch (error) {
        console.error(error);
        return null;
      }
    }
  }
}
//#endregion

let enableFilters = null;
const shouldProcessComments = window.location.href.includes("/story/");

const config = {
  minStoryRating: 100,
  summary: true,

  filteringPageRegex: "^https?:\\/\\/pikabu.ru\\/(|best|companies)$",

  ratingBar: false,
  ratingBarComments: false,
  minRatesCountToShowRatingBar: 10,

  minusesPattern: null,
  minusesCommentPattern: null,

  ownCommentPattern: null,

  videoDownloadButtons: false,

  update() {
    config.minStoryRating = GM_config.get("minStoryRating").valueOf() as number;
    config.summary = GM_config.get("summary").valueOf() as boolean;
    config.filteringPageRegex = GM_config.get(
      "filteringPageRegex"
    ).valueOf() as string;
    config.ratingBar = GM_config.get("ratingBar").valueOf() as boolean;
    config.ratingBarComments = GM_config.get(
      "ratingBarComments"
    ).valueOf() as boolean;
    config.minRatesCountToShowRatingBar = GM_config.get(
      "minRatesCountToShowRatingBar"
    ).valueOf() as number;

    function makeEval(args: string, str: string) {
      return new Function(args, "return " + str);
    }

    config.minusesPattern = makeEval(
      "story",
      (GM_config.get("minusesPattern").valueOf() as string).replace(
        "%d",
        "story.minuses"
      )
    );
    config.minusesCommentPattern = makeEval(
      "comment",
      (GM_config.get("minusesCommentPattern").valueOf() as string).replace(
        "%d",
        "comment.minuses"
      )
    );
    config.ownCommentPattern = makeEval(
      "comment",
      GM_config.get("ownCommentPattern").valueOf() as string
    );

    config.videoDownloadButtons = GM_config.get(
      "videoDownloadButtons"
    ).valueOf() as boolean;

    enableFilters = new RegExp(config.filteringPageRegex).test(
      window.location.href
    );
  },

  formatMinuses(story): string {
    return config.minusesPattern(story).toString();
  },
  formatCommentMinuses(comment): string {
    return config.minusesCommentPattern(comment).toString();
  },
  formatOwnRating(comment): string {
    return config.ownCommentPattern(comment).toString();
  },
};

let isConfigInit = false;
GM_config.init({
  id: "prm",
  title: (() => {
    const title = document.createElement("a");
    title.href = "https://t.me/return_pikabu";
    title.textContent = "Return Pikabu minus";

    return title;
  })(),
  fields: {
    minStoryRating: {
      section: ["Основные настройки"],
      type: "int",
      default: config.minStoryRating,
      label: "Посты с рейтингом ниже указанного будут удаляться из ленты.",
    },
    summary: {
      type: "checkbox",
      default: config.summary,
      label: "Отображение суммарного рейтинга у постов и комментариев.",
    },
    ratingBar: {
      type: "checkbox",
      default: config.ratingBar,
      label:
        "Отображение соотношения плюсов и минусов у постов. При отсутствии оценок у поста будет показано соотношение 1:1.",
    },
    ratingBarComments: {
      type: "checkbox",
      default: config.ratingBarComments,
      label: "Отображение соотношения плюсов и минусов у комментариев.",
    },
    minRatesCountToShowRatingBar: {
      type: "int",
      default: config.minRatesCountToShowRatingBar,
      label:
        "Минимальное количество оценок у поста или комментария для отображения соотношения плюсов и минусов. Установите на 0, чтобы всегда показывать.",
    },

    videoDownloadButtons: {
      section: ["Дополнительно"],
      type: "checkbox",
      label:
        "Добавляет к встроенным видео в правом нижнем углу прямые ссылки на видео (обычно это mp4 и webm).",
      default: config.videoDownloadButtons,
    },

    filteringPageRegex: {
      section: ["Продвинутые настройки"],
      type: "text",
      label:
        "Страницы, на которых работает фильтрация по рейтингу (регулярное выражение).",
      default: config.filteringPageRegex,
    },

    minusesPattern: {
      type: "text",
      default: "story.minuses",
      label:
        "Шаблон отображения минусов у постов (JS). Пример: `story.minuses * 5000`. story: {id, rating, pluses, minuses}. Может быть опасно, поэтому не рекомендуется вставлять подозрительные строки сюда.",
    },
    minusesCommentPattern: {
      type: "text",
      default: "comment.minuses",
      label:
        "Шаблон отображения минусов у комментариев (JS). Пример: `comment.minuses * 5000`. comment: {id, rating, pluses, minuses}. Может быть опасно, поэтому не рекомендуется вставлять подозрительные строки сюда.",
    },
    ownCommentPattern: {
      type: "text",
      default:
        "(comment.pluses == 0 && comment.minuses == 0) ? 0 : `${comment.pluses}/${comment.minuses}`",
      label:
        "Шаблон отображения рейтинга у ВАШИХ комментариев (JS). Пример: `comment.minuses * 5000`. comment: {id, rating, pluses, minuses}. Может быть опасно, поэтому не рекомендуется вставлять подозрительные строки сюда.",
    },
  },
  events: {
    init() {
      isConfigInit = true;
      config.update();
    },
    save() {
      config.update();
    },
  },
});

const waitConfig = new Promise<void>((resolve) => {
  let isInit = () => setTimeout(() => (isConfigInit ? resolve() : isInit()), 1);
  isInit();
});

GM.registerMenuCommand("Открыть настройки", () => {
  GM_config.open();
});

function addCss(css: string) {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = css;
  // is added to the end of the body because it must override some of the original styles
  document.body.appendChild(styleSheet);
}

class CommentData {
  public id: number;
  public rating: number;
  public pluses: number;
  public minuses: number;

  public constructor(data: Pikabu.Comment) {
    this.id = data.id;
    this.rating = data.rating;
    this.pluses = data.pluses;
    this.minuses = data.minuses;
  }
}

const cachedComments = new Map<number, CommentData>();
let oldInterface = null;

async function blockAuthorForever(button: HTMLButtonElement, authorId: number) {
  button.disabled = true;

  // const fetch = unsafeWindow.fetch;
  try {
    await fetch(
      `https://pikabu.ru/ajax/ignore_actions.php?authors=${authorId}&story_id=0&period=forever&action=add_rule`,
      {
        method: "POST",
      }
    );
    button.remove();
  } catch {
    button.disabled = false;
  }
}

const blockIconTemplate = (function () {
  const div = document.createElement("div");
  div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__save"><use xlink:href="#icon--ui__ban"></use></svg>`;
  return div.firstChild;
})();

function addBlockButton(story: HTMLDivElement) {
  const saveButton = story.querySelector(".story__save");

  if (saveButton === null) {
    console.warn("[RPM] Failed to add a block button to", story);
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

  saveButton.parentElement.insertBefore(button, saveButton);
}

function processComment(comment: Pikabu.Comment | CommentData) {
  const commentElem = document.getElementById(
    `comment_${comment.id}`
  ) as HTMLDivElement;

  if (commentElem === null) {
    if (comment instanceof Pikabu.Comment)
      cachedComments[comment.id] = new CommentData(comment);
    return;
  }

  const userElem = commentElem.querySelector(".comment__user");

  if (
    userElem.hasAttribute("data-own") &&
    userElem.getAttribute("data-own") === "true"
  ) {
    const textRatingElem = commentElem.querySelector(
      ".comment__rating-count"
    ) as HTMLDivElement;
    textRatingElem.innerText = config.formatOwnRating(comment);
    return;
  }

  const ratingDown = commentElem.querySelector(".comment__rating-down");

  const minusesText = document.createElement("div");
  minusesText.classList.add("comment__rating-count");
  ratingDown.prepend(minusesText);

  minusesText.textContent = config.formatCommentMinuses(comment);

  if (config.summary) {
    const summary = document.createElement("div");
    summary.classList.add("comment__rating-count", "rpm-summary");
    summary.textContent = comment.rating.toString();

    ratingDown.parentElement.insertBefore(summary, ratingDown);
  }

  const totalRates = comment.pluses + comment.minuses;
  if (
    config.ratingBarComments &&
    totalRates >= config.minRatesCountToShowRatingBar
  ) {
    let ratio: number = 0.5;

    if (totalRates > 0) ratio = comment.pluses / totalRates;

    addRatingBar(commentElem, ratio);
  }
}

async function processStoryComments(
  storyId: number,
  storyData: Pikabu.CommentsData,
  page: number
) {
  for (const comment of storyData.comments) {
    processComment(comment);
  }

  if (storyData.comments.length >= 100) {
    storyData = await Pikabu.DataService.fetchStory(storyId, page + 1);
    await processStoryComments(storyId, storyData, page + 1);
  }
}

function addRatingBar(story: HTMLDivElement, ratio: number) {
  const block = story.querySelector(
    ".story__rating-block, .comment__body, .story__emotions"
  );

  if (block !== null) {
    const bar = document.createElement("div");
    const inner = document.createElement("div");

    bar.append(inner);

    bar.classList.add("rpm-rating-bar");
    inner.classList.add("rpm-rating-bar-inner");

    inner.style.height = (ratio * 100).toFixed(1) + "%";

    block.prepend(bar);
  } else {
    // TODO mobile
  }
}

function processOldStory(
  story: HTMLDivElement,
  storyData: Pikabu.CommentsData
) {
  addBlockButton(story);

  let ratingElem = story.querySelector(".story__footer-rating > div");
  let isMobile = false;

  if (ratingElem !== null) {
    // mobile
    isMobile = true;
  } else {
    // pc
    ratingElem = story.querySelector(".story__left .story__rating-block");
  }
  if (ratingElem === null) {
    return false;
  }
  oldInterface = true;

  let ratingDown = ratingElem.querySelector(
    ".story__rating-minus, .story__rating-down"
  );

  if (isMobile) {
    const buttonMinus = document.createElement("button");
    buttonMinus.classList.add("story__rating-minus");
    buttonMinus.innerHTML = `
    <span class="story__rating-rpm-count">${storyData.story.minuses}</span>
    <span type="button" class="tool story__rating-down" data-role="rating-down">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__rating-down icon--ui__rating-down_story">
        <use xlink:href="#icon--ui__rating-down"></use>
      </svg>
    </span>`;
    ratingDown.replaceWith(buttonMinus);
    ratingDown = buttonMinus;
  } else {
    const minusesCounter = document.createElement("div");
    minusesCounter.classList.add("story__rating-count");
    minusesCounter.textContent = config.formatMinuses(storyData.story);

    ratingDown.prepend(minusesCounter);
  }

  if (config.summary) {
    const summary = document.createElement("div");
    if (isMobile)
      summary.classList.add("story__rating-rpm-count", "rpm-summary");
    else summary.classList.add("story__rating-count");
    summary.textContent = storyData.story.rating.toString();

    ratingDown.parentElement.insertBefore(summary, ratingDown);
  }

  const totalRates = storyData.story.pluses + storyData.story.minuses;
  if (config.ratingBar && totalRates >= config.minRatesCountToShowRatingBar) {
    let ratio: number = 0.5;

    if (totalRates > 0) ratio = storyData.story.pluses / totalRates;

    addRatingBar(story, ratio);
  }

  processStoryComments(storyData.story.id, storyData, 1);

  return true;
}

async function processStory(story: HTMLDivElement, processComments: boolean) {
  const storyId = parseInt(story.getAttribute("data-story-id"));

  // get story data
  const storyData = await Pikabu.DataService.fetchStory(storyId, 1);

  // delete the story if its ratings < the min rating
  if (
    enableFilters &&
    storyData.story.rating < (config.minStoryRating as number)
  ) {
    story.remove();
    return;
  }

  if (oldInterface === true) {
    processOldStory(story, storyData);
    return;
  }
  const ratingElem = story.querySelector(".story__rating");
  if (ratingElem === null) {
    if (oldInterface === null && !processOldStory(story, storyData)) {
      console.warn("У поста нет элементов рейтинга.", story);
    }
    return;
  }

  oldInterface = false;
  const ratingDown = ratingElem.querySelector(".story__rating-down");

  const minusesText = document.createElement("div");
  minusesText.classList.add("story__rating-rpm-count");
  ratingDown.prepend(minusesText);

  minusesText.textContent = config.formatMinuses(storyData.story);

  if (config.summary) {
    const summary = document.createElement("div");
    summary.classList.add("story__rating-rpm-count", "rpm-summary");
    summary.textContent = storyData.story.rating.toString();

    ratingElem.insertBefore(summary, ratingDown);
  }

  if (shouldProcessComments) {
    await processStoryComments(storyData.story.id, storyData, 1);
  }
}

async function processStories(stories: Iterable<HTMLDivElement>) {
  for (const story of stories) {
    processStory(story, false);
  }
}

function processCached(commentElem: HTMLDivElement) {
  const commentId = parseInt(commentElem.getAttribute("data-id"));

  if (commentId in cachedComments) {
    processComment(cachedComments[commentId]);
    delete cachedComments[commentId];
  }
}

function addVideoDownloadButtons(playerElement: HTMLDivElement) {
  const videoElement: HTMLVideoElement = playerElement.querySelector(
    "video.player__video"
  );
  const videoControls: HTMLDivElement =
    playerElement.querySelector(".player__controls");

  if (videoElement === null || videoControls === null) return;

  function addButton(link: string) {
    const a = document.createElement("a");
    a.classList.add("rpm-download-video-button");

    const name = link.split("/").pop(); // "https://example/com/some_cool_video.mp4" -> "some_cool_video.mp4"
    const extension = name.split(".").slice(1).join("."); // "some_cool_video.mp4" -> "mp4" (and "video.av1.mp4" -> "av1.mp4")

    a.href = link;
    a.download = name;
    a.textContent = extension;

    // add link to controls
    videoControls.append(a);
  }

  const sources: Array<HTMLSourceElement> = Array.from(
    videoElement.children
  ) as Array<HTMLSourceElement>;
  if (sources.length == 0)
    sources.push(videoElement as any as HTMLSourceElement);

  for (const source of sources) {
    addButton(source.src);
  }
}

function mutationsListener(
  mutationList: MutationRecord[],
  observer: MutationObserver
) {
  for (const mutation of mutationList) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;

      if (node.matches(".comment__header")) {
        const commentElem = node.closest(".comment") as HTMLDivElement;
        processCached(commentElem);
      } else if (node.matches("article.story")) {
        const storyElem = node as HTMLDivElement;
        processStory(storyElem, false);
      } else if (
        config.videoDownloadButtons &&
        node.matches(".player__player")
      ) {
        try {
          addVideoDownloadButtons(node as HTMLDivElement);
        } catch (error) {
          console.error("[RPM] Error addVideoDownloadButtons(): ", error);
        }
      }
    }
  }
}

var observer: MutationObserver = null;

async function main() {
  await waitConfig;

  addCss(`.story__rating-up {
  margin-right: 5px !important;
}
.prm-minuses {
  padding-left: 7px !important;
  margin: 0px !important;
}
.story__rating-down {
  margin-left: 0 !important;
}
.story__rating-count {
  margin: 7px 0 7px;
}
.rpm-summary-comment {
  margin-right: 8px;
}
.comment__rating-down .comment__rating-count {
  margin-right: 8px;
}
.comment__rating-down {
  padding: 2px 8px;
}
.story__footer .story__rating-rpm-count {
  font-size: 13px;
  color: var(--color-black-700);
  margin: auto 7px auto 7px;
  line-height: 0;
  display: block;
}
.story__footer .rpm-summary,
.comment .rpm-summary {
  margin: auto 9px auto 0px;
  font-weight: 500;
}
.comment__rating-rpm-count {
  padding: 2px 8px;
  flex-shrink: 0;
  margin-left: auto;
}
.rpm-rating-bar {
  width: 5px;
  background: var(--color-danger-800);
  height: 90%;
  position: absolute;
  right: -9.5px;
  top: 5%;
  border-radius: 5px;
}
.rpm-rating-bar-inner {
  background: var(--color-primary-700);    /* width: 99%; */
  border-radius: 5px;
}
.comment__body {
  position: relative;
}
.comment .rpm-rating-bar {
  height: 70px;
  top: 15px;
  left: -10px;
}  /* old mobile interface */
.story__footer-rating .story__rating-minus {
  background-color:var(--color-black-300);
  border-radius:8px;
  overflow:hidden;
  padding:0;
  display:flex;
  align-items:center  ;
}
.story__footer-rating .story__rating-down {
  display:flex;
  align-items:center;
  justify-content:center;
  padding-left:2px  ;
}
.rpm-download-video-button {
  color: var(--color-bright-900);
  font-size: 125%;
  margin-left: 3px;
}

.rpm-block-author {
  overflow:hidden;
  margin-right:24px;
  cursor:pointer;
  display:flex;
  align-items:center;
  padding:0;
  background:0 0 
}
.rpm-block-author:hover * {
  fill: var(--color-danger-800);
}`);

  // process static posts
  processStories(document.querySelectorAll("article.story"));

  observer = new MutationObserver(mutationsListener);
  observer.observe(document.querySelector(".app__content, .main__inner"), {
    childList: true,
    subtree: true,
  });
}

window.addEventListener("load", main);
