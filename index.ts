// ==UserScript==
// @name         Return Pikabu minus
// @version      0.5.2
// @namespace    pikabu-return-minus.pyxiion.ru
// @description  Возвращает минусы на Pikabu, а также фильтрацию по рейтингу.
// @author       PyXiion
// @match        *://pikabu.ru/*
// @connect      api.pikabu.ru
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
  onError(response: GM.Response<undefined>): void
  onSuccess(response: GM.Response<undefined>): void
}

class HttpRequest 
{
  protected headers: Map<string, string>;
  protected httpMethod: HttpMethod;
  protected url: string;
  protected timeout: number;

  public constructor(url: string)
  {
    this.url = url;
    this.httpMethod = "POST";
    this.headers = new Map<string, string>();
    this.timeout = 15000;
  }

  public addHeader(key: string, value: string)
  {
    this.headers.set(key, value);
    return this;
  }
  public setHttpMethod(httpMethod: HttpMethod)
  {
    this.httpMethod = httpMethod;
    return this;
  }

  // virtual
  protected getData(): any
  {
    return {};
  }

  public execute(callback: HttpRequestCallback)
  {
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

  public executeAsync()
  {
    return new Promise<GM.Response<undefined>>((resolve, reject) => {
      this.execute({
        onError: reject,
        onSuccess: resolve
      })
    });
  }
};

//#endregion

//#region Pikabu API

namespace Pikabu
{
  const DOMAIN = "https://api.pikabu.ru/"
  const API_V1 = DOMAIN + "v1/"
  const API_KEY = "kmq4!2cPl)peZ";

  type PikabuController =
    "story.get";

  class API 
  {
    static readonly USER_AGENT = "ru.pikabu.android/1.21.15 (SM-N975F Android 7.1.2)";
    static readonly COOKIE = "unqKms867=aba48a160c; rm5bH=8c68fbfe3dc5e5f5b23a9ec1a8f784f8";
    
    public static getDeviceId(): string
    {
      return "0";
    }
  }

  class Request extends HttpRequest 
  {
    private controller: PikabuController;
    private params: PikabuJson.RequestParams;

    public constructor(domain: string, controller: PikabuController, params?: PikabuJson.RequestParams)
    {
      super(domain + controller);
      this.controller = controller;

      this.params = params;

      this.setHttpMethod("GET");
      this.addHeader("DeviceId", API.getDeviceId());
      this.addHeader("User-Agent", API.USER_AGENT);
      this.addHeader("Cookie", API.COOKIE);
      this.addHeader("Content-Type", "application/json");
    }

    public setParam(key: string, value: string | number)
    {
      this.params[key] = value;
    }

    private static getHash(data: PikabuJson.RequestParams, controller: string, ms: number)
    {
      const join = Object.values(data).sort().join(',');
      const toHash = [API_KEY, controller, ms, join].join(",");
      const hashed = MD5(toHash);
      return btoa(hashed);
    }

    protected override getData(): any {
      const ms = Date.now();
      const data = {
        new_sort: 1,
        ...this.params
      }

      return {
        ...data,
        id: "iws",
        hash: Request.getHash(data, this.controller, ms),
        token: ms
      };
    }

    public async executeAsync(): Promise<any> {
      const response = await super.executeAsync();
      const data: PikabuJson.Response = response.response;
      
      if (! ("response" in data))
      {
        throw new Error(data?.error?.message ?? "Unknown error");
      }

      return data.response;
    }
  }

  class PostRequest extends Request
  {
    public constructor(controller: PikabuController, params?: PikabuJson.RequestParams)
    {
      super(API_V1, controller, params)
      this.setHttpMethod("POST");
    }
  }

  export class RatingObject
  {
    public id: number;
    public rating: number;
    public pluses: number;
    public minuses: number;
  }

  export class Post extends RatingObject
  {
    public constructor(payload: PikabuJson.Story)
    {
      super();
      this.id = payload.story_id;
      this.rating = payload.story_digs ?? 0;
      this.pluses = payload.story_pluses ?? 0;
      this.minuses = payload.story_minuses ?? 0;
    } 
  }

  export class Comment extends RatingObject
  {
    public parentId: number;

    public constructor(payload: PikabuJson.Comment)
    {
      super();
      this.id = payload.comment_id;
      this.parentId = payload.parent_id;
      this.rating = payload.comment_rating ?? 0;
      this.pluses = payload.comment_pluses ?? 0;
      this.minuses = payload.comment_minuses ?? 0;
    } 
  }

  export class StoryData 
  {
    public story: Post;

    public constructor(payload: PikabuJson.StoryGetResponse)
    {
      this.story = 'story' in payload ? new Post(payload.story) : null;
    }
  }
  export class CommentsData extends StoryData
  {
    public comments: Comment[];
    public selectedCommentId: number;

    public constructor(payload: PikabuJson.StoryGetResponse)
    {
      super(payload);

      this.selectedCommentId = 0;
      this.comments = payload.comments.map((x) => new Comment(x));
    }
  }

  export namespace DataService
  {
    export async function fetchStory(storyId: number, commentsPage: number): Promise<CommentsData>
    {
      const params: PikabuJson.RequestParamsGetStory = {
        story_id: storyId,
        page: commentsPage
      };

      try
      {
        const request = new PostRequest("story.get", params);
        const payload = (await request.executeAsync()) as PikabuJson.StoryGetResponse;

        const commentsData = new CommentsData(payload);
        
        return commentsData;
      }
      catch (error)
      {
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

  filteringPageRegex: '^https?:\\/\\/pikabu.ru\\/(|best|companies)$',

  update() {
    config.minStoryRating = GM_config.get("minStoryRating").valueOf() as number;
    config.summary = GM_config.get("summary").valueOf() as boolean;
    config.filteringPageRegex = GM_config.get('filteringPageRegex').valueOf() as string;

    enableFilters = new RegExp(config.filteringPageRegex).test(window.location.href);
  }
};

let isConfigInit = false;
GM_config.init({
  id: 'prm',
  title: (() => {
    const title = document.createElement('a');
    title.href = 'https://t.me/return_pikabu';
    title.textContent = 'Return Pikabu minus';

    return title;
  })(),
  fields: {
    minStoryRating: {
      section: ["Основные настройки"],
      type: 'int',
      default: config.minStoryRating,
      label: 'Посты с рейтингом ниже указанного будут удаляться из ленты.',
    },
    summary: {
      type: 'checkbox',
      default: config.summary,
      label: 'Отображение суммарного рейтинга у постов и комментариев',
    }, 
    filteringPageRegex: {
      section: ["Продвинутые настройки"],
      type: 'text',
      label: 'Страницы, на которых работает фильтрация по рейтингу (регулярное выражение).',
      default: config.filteringPageRegex,
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
})

const waitConfig = new Promise<void>(resolve => {
  let isInit = () => setTimeout(() =>
    isConfigInit ? resolve() : isInit(), 1);
  isInit();
});

GM.registerMenuCommand('Открыть настройки', () => {
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

function processComment(comment: Pikabu.Comment | CommentData) {
  const commentElem = document.getElementById(`comment_${comment.id}`);

  if (commentElem === null) {
    if (comment instanceof Pikabu.Comment)
      cachedComments[comment.id] = new CommentData(comment);
    return;
  }

  const ratingDown = commentElem.querySelector('.comment__rating-down');

  const minusesText = document.createElement('div');
  minusesText.classList.add('comment__rating-count');
  ratingDown.prepend(minusesText);

  minusesText.textContent = comment.minuses.toString();

  if (config.summary) { 
    const summary = document.createElement('div');
    summary.classList.add('comment__rating-count', 'rpm-summary-comment');
    summary.textContent = comment.rating.toString();

    ratingDown.parentElement.insertBefore(summary, ratingDown);
  }
}

async function processStoryComments(storyId: number, storyData: Pikabu.CommentsData, page: number) {
  for (const comment of storyData.comments) {
    processComment(comment);
  }
  
  if (storyData.comments.length >= 100) {
    storyData = await Pikabu.DataService.fetchStory(storyId, page + 1);
    await processStoryComments(storyId, storyData, page + 1);
  }
}

function processOldStory(story: HTMLDivElement, storyData: Pikabu.CommentsData) {
  let ratingElem = story.querySelector('.story__footer-rating > div');
  let isMobile = false;

  if (ratingElem !== null) { // mobile
    isMobile = true;
  } else { // pc
    ratingElem = story.querySelector('.story__left .story__rating-block');
  }
  if (ratingElem === null) {
    return false;
  }
  oldInterface = true;

  let ratingDown = ratingElem.querySelector('.story__rating-minus, .story__rating-down');
  
  if (isMobile) {
    const buttonMinus = document.createElement('button');
    buttonMinus.classList.add('story__rating-minus')
    buttonMinus.innerHTML = `
    <span class="story__rating-count">${storyData.story.minuses}</span>
    <span type="button" class="tool story__rating-down" data-role="rating-down">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__rating-down icon--ui__rating-down_story">
        <use xlink:href="#icon--ui__rating-down"></use>
      </svg>
    </span>`

    ratingDown.replaceWith(buttonMinus);
    ratingDown = buttonMinus;
  } else {
    const minusesCounter = document.createElement('div');
    minusesCounter.classList.add('story__rating-count');
    minusesCounter.textContent = storyData.story.minuses.toString();

    ratingDown.prepend(minusesCounter);
  }

  if (config.summary) {
    const summary = document.createElement('div');
    summary.classList.add('story__rating-count')
    summary.textContent = storyData.story.rating.toString();

    ratingDown.parentElement.insertBefore(summary, ratingDown);
  }

  processStoryComments(storyData.story.id, storyData, 1);

  return true;
}

async function processStory(story: HTMLDivElement, processComments: boolean) {
  const storyId = parseInt(story.getAttribute('data-story-id'));

  // get story data
  const storyData = await Pikabu.DataService.fetchStory(storyId, 1);

  // delete the story if its ratings < the min rating
  if (enableFilters && storyData.story.rating < (config.minStoryRating as number)) {
    story.remove();
    return;
  }

  if (oldInterface === true) {
    processOldStory(story, storyData);
    return;
  }

  const ratingElem = story.querySelector('.story__rating');
  if (ratingElem === null) {
    if (oldInterface === null && !processOldStory(story, storyData)) {
      console.warn('У поста нет элементов рейтинга.', story);
    }
    return;
  }
  oldInterface = false;
  const ratingDown = ratingElem.querySelector('.story__rating-down');

  const minusesText = document.createElement('div');
  minusesText.classList.add('prm-minuses', 'story__rating-count');
  ratingDown.prepend(minusesText);

  minusesText.textContent = storyData.story.minuses.toString();

  if (config.summary) {
    const summary = document.createElement('div')
    summary.classList.add('ptr-summary-rating', 'story__rating-count');
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
  const commentId = parseInt(commentElem.getAttribute('data-id'));
  
  if (commentId in cachedComments) {
    processComment(cachedComments[commentId]);
    delete cachedComments[commentId];
  }
}

function mutationsListener(mutationList: MutationRecord[], observer: MutationObserver) {
  for (const mutation of mutationList) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement))
        continue;

      if (node.matches(".comment__header")) {
        console.log(node)
        const commentElem = node.closest('.comment') as HTMLDivElement;
        processCached(commentElem);
      } else if (node.matches('article.story')) {
        const storyElem = node as HTMLDivElement;
        console.log(storyElem);
        processStory(storyElem, false);
      } else {
      }
    }
  }
}

var observer: MutationObserver = null;

async function main() {
  await waitConfig;

  addCss(`
  .story__rating-up {
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
  
  /* old mobile interface */
  .story__footer-rating .story__rating-minus {
    background-color:var(--color-black-300);
    border-radius:8px;
    overflow:hidden;
    padding:0;
    display:flex;
    align-items:center
  }
   
  .story__footer-rating .story__rating-down {
    display:flex;
    align-items:center;
    justify-content:center;
    padding-left:2px
  }`)

  // process static posts
  processStories(document.querySelectorAll("article.story"))

  observer = new MutationObserver(mutationsListener);
  observer.observe(document.querySelector('.app__content, .main__inner'), {
    childList: true,
    subtree: true,
  })
}

window.addEventListener('load', main)