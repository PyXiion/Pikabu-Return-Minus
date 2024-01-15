// ==UserScript==
// @name         Return Pikabu minus
// @version      0.5.3
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
class HttpRequest {
    constructor(url) {
        this.url = url;
        this.httpMethod = "POST";
        this.headers = new Map();
        this.timeout = 15000;
    }
    addHeader(key, value) {
        this.headers.set(key, value);
        return this;
    }
    setHttpMethod(httpMethod) {
        this.httpMethod = httpMethod;
        return this;
    }
    // virtual
    getData() {
        return {};
    }
    execute(callback) {
        const details = {
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
        details.anonymous = true;
        GM.xmlHttpRequest(details);
    }
    executeAsync() {
        return new Promise((resolve, reject) => {
            this.execute({
                onError: reject,
                onSuccess: resolve
            });
        });
    }
}
;
//#endregion
//#region Pikabu API
var Pikabu;
(function (Pikabu) {
    const DOMAIN = "https://api.pikabu.ru/";
    const API_V1 = DOMAIN + "v1/";
    const API_KEY = "kmq4!2cPl)peZ";
    class API {
        static getDeviceId() {
            return "0";
        }
    }
    API.USER_AGENT = "ru.pikabu.android/1.21.15 (SM-N975F Android 7.1.2)";
    API.COOKIE = "unqKms867=aba48a160c; rm5bH=8c68fbfe3dc5e5f5b23a9ec1a8f784f8";
    class Request extends HttpRequest {
        constructor(domain, controller, params) {
            super(domain + controller);
            this.controller = controller;
            this.params = params;
            this.setHttpMethod("GET");
            this.addHeader("DeviceId", API.getDeviceId());
            this.addHeader("User-Agent", API.USER_AGENT);
            this.addHeader("Cookie", API.COOKIE);
            this.addHeader("Content-Type", "application/json");
        }
        setParam(key, value) {
            this.params[key] = value;
        }
        static getHash(data, controller, ms) {
            const join = Object.values(data).sort().join(',');
            const toHash = [API_KEY, controller, ms, join].join(",");
            const hashed = MD5(toHash);
            return btoa(hashed);
        }
        getData() {
            const ms = Date.now();
            const data = {
                new_sort: 1,
                ...this.params
            };
            return {
                ...data,
                id: "iws",
                hash: Request.getHash(data, this.controller, ms),
                token: ms
            };
        }
        async executeAsync() {
            const response = await super.executeAsync();
            const data = response.response;
            if (!("response" in data)) {
                throw new Error(data?.error?.message ?? "Unknown error");
            }
            return data.response;
        }
    }
    class PostRequest extends Request {
        constructor(controller, params) {
            super(API_V1, controller, params);
            this.setHttpMethod("POST");
        }
    }
    class RatingObject {
    }
    Pikabu.RatingObject = RatingObject;
    class Post extends RatingObject {
        constructor(payload) {
            super();
            this.id = payload.story_id;
            this.rating = payload.story_digs ?? 0;
            this.pluses = payload.story_pluses ?? 0;
            this.minuses = payload.story_minuses ?? 0;
        }
    }
    Pikabu.Post = Post;
    class Comment extends RatingObject {
        constructor(payload) {
            super();
            this.id = payload.comment_id;
            this.parentId = payload.parent_id;
            this.rating = payload.comment_rating ?? 0;
            this.pluses = payload.comment_pluses ?? 0;
            this.minuses = payload.comment_minuses ?? 0;
        }
    }
    Pikabu.Comment = Comment;
    class StoryData {
        constructor(payload) {
            this.story = 'story' in payload ? new Post(payload.story) : null;
        }
    }
    Pikabu.StoryData = StoryData;
    class CommentsData extends StoryData {
        constructor(payload) {
            super(payload);
            this.selectedCommentId = 0;
            this.comments = payload.comments.map((x) => new Comment(x));
        }
    }
    Pikabu.CommentsData = CommentsData;
    let DataService;
    (function (DataService) {
        async function fetchStory(storyId, commentsPage) {
            const params = {
                story_id: storyId,
                page: commentsPage
            };
            try {
                const request = new PostRequest("story.get", params);
                const payload = (await request.executeAsync());
                const commentsData = new CommentsData(payload);
                return commentsData;
            }
            catch (error) {
                console.error(error);
                return null;
            }
        }
        DataService.fetchStory = fetchStory;
    })(DataService = Pikabu.DataService || (Pikabu.DataService = {}));
})(Pikabu || (Pikabu = {}));
//#endregion
let enableFilters = null;
const shouldProcessComments = window.location.href.includes("/story/");
const config = {
    minStoryRating: 100,
    summary: true,
    filteringPageRegex: '^https?:\\/\\/pikabu.ru\\/(|best|companies)$',
    ratingBar: false,
    ratingBarComments: false,
    minRatesCountToShowRatingBar: 10,
    update() {
        config.minStoryRating = GM_config.get("minStoryRating").valueOf();
        config.summary = GM_config.get("summary").valueOf();
        config.filteringPageRegex = GM_config.get('filteringPageRegex').valueOf();
        config.ratingBar = GM_config.get('ratingBar').valueOf();
        config.ratingBarComments = GM_config.get('ratingBarComments').valueOf();
        config.minRatesCountToShowRatingBar = GM_config.get('minRatesCountToShowRatingBar').valueOf();
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
        ratingBar: {
            type: "checkbox",
            default: config.ratingBar,
            label: 'Отображение соотношения плюс и минусов у постов. При отсутствии оценок у поста будет показано соотношение 1:1.'
        },
        ratingBarComments: {
            type: "checkbox",
            default: config.ratingBarComments,
            label: 'Отображение соотношения плюс и минусов у комментариев'
        },
        minRatesCountToShowRatingBar: {
            type: "int",
            default: config.minRatesCountToShowRatingBar,
            label: 'Минимальное количество оценок у поста/комментария для отображения соотношения плюсов и минусов. Установите на 0, чтобы всегда показывать.'
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
});
const waitConfig = new Promise(resolve => {
    let isInit = () => setTimeout(() => isConfigInit ? resolve() : isInit(), 1);
    isInit();
});
GM.registerMenuCommand('Открыть настройки', () => {
    GM_config.open();
});
function addCss(css) {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = css;
    // is added to the end of the body because it must override some of the original styles
    document.body.appendChild(styleSheet);
}
class CommentData {
    constructor(data) {
        this.id = data.id;
        this.rating = data.rating;
        this.pluses = data.pluses;
        this.minuses = data.minuses;
    }
}
const cachedComments = new Map();
let oldInterface = null;
function processComment(comment) {
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
    const totalRates = comment.pluses + comment.minuses;
    if (config.ratingBarComments && totalRates >= config.minRatesCountToShowRatingBar) {
        let ratio = 0.5;
        if (totalRates > 0)
            ratio = comment.pluses / totalRates;
        addRatingBar(commentElem, ratio);
    }
}
async function processStoryComments(storyId, storyData, page) {
    for (const comment of storyData.comments) {
        processComment(comment);
    }
    if (storyData.comments.length >= 100) {
        storyData = await Pikabu.DataService.fetchStory(storyId, page + 1);
        await processStoryComments(storyId, storyData, page + 1);
    }
}
function addRatingBar(story, ratio) {
    const block = story.querySelector('.story__rating-block, .comment__body, .story__emotions');
    console.log(story, block, ratio);
    if (block !== null) {
        const bar = document.createElement('div');
        const inner = document.createElement('div');
        bar.append(inner);
        bar.classList.add('rpm-rating-bar');
        inner.classList.add('rpm-rating-bar-inner');
        inner.style.height = (ratio * 100).toFixed(1) + "%";
        block.prepend(bar);
    }
    else {
        // TODO mobile
    }
}
function processOldStory(story, storyData) {
    let ratingElem = story.querySelector('.story__footer-rating > div');
    let isMobile = false;
    if (ratingElem !== null) { // mobile
        isMobile = true;
    }
    else { // pc
        ratingElem = story.querySelector('.story__left .story__rating-block');
    }
    if (ratingElem === null) {
        return false;
    }
    oldInterface = true;
    let ratingDown = ratingElem.querySelector('.story__rating-minus, .story__rating-down');
    if (isMobile) {
        const buttonMinus = document.createElement('button');
        buttonMinus.classList.add('story__rating-minus');
        buttonMinus.innerHTML = `
    <span class="story__rating-count">${storyData.story.minuses}</span>
    <span type="button" class="tool story__rating-down" data-role="rating-down">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__rating-down icon--ui__rating-down_story">
        <use xlink:href="#icon--ui__rating-down"></use>
      </svg>
    </span>`;
        ratingDown.replaceWith(buttonMinus);
        ratingDown = buttonMinus;
    }
    else {
        const minusesCounter = document.createElement('div');
        minusesCounter.classList.add('story__rating-count');
        minusesCounter.textContent = storyData.story.minuses.toString();
        ratingDown.prepend(minusesCounter);
    }
    if (config.summary) {
        const summary = document.createElement('div');
        summary.classList.add('story__rating-count');
        summary.textContent = storyData.story.rating.toString();
        ratingDown.parentElement.insertBefore(summary, ratingDown);
    }
    const totalRates = storyData.story.pluses + storyData.story.minuses;
    if (config.ratingBar && totalRates >= config.minRatesCountToShowRatingBar) {
        let ratio = 0.5;
        if (totalRates > 0)
            ratio = storyData.story.pluses / totalRates;
        addRatingBar(story, ratio);
    }
    processStoryComments(storyData.story.id, storyData, 1);
    return true;
}
async function processStory(story, processComments) {
    const storyId = parseInt(story.getAttribute('data-story-id'));
    // get story data
    const storyData = await Pikabu.DataService.fetchStory(storyId, 1);
    // delete the story if its ratings < the min rating
    if (enableFilters && storyData.story.rating < config.minStoryRating) {
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
        const summary = document.createElement('div');
        summary.classList.add('ptr-summary-rating', 'story__rating-count');
        summary.textContent = storyData.story.rating.toString();
        ratingElem.insertBefore(summary, ratingDown);
    }
    if (shouldProcessComments) {
        await processStoryComments(storyData.story.id, storyData, 1);
    }
}
async function processStories(stories) {
    for (const story of stories) {
        processStory(story, false);
    }
}
function processCached(commentElem) {
    const commentId = parseInt(commentElem.getAttribute('data-id'));
    if (commentId in cachedComments) {
        processComment(cachedComments[commentId]);
        delete cachedComments[commentId];
    }
}
function mutationsListener(mutationList, observer) {
    for (const mutation of mutationList) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement))
                continue;
            if (node.matches(".comment__header")) {
                console.log(node);
                const commentElem = node.closest('.comment');
                processCached(commentElem);
            }
            else if (node.matches('article.story')) {
                const storyElem = node;
                console.log(storyElem);
                processStory(storyElem, false);
            }
            else {
            }
        }
    }
}
var observer = null;
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
    background: var(--color-primary-700);
    /* width: 99%; */
    border-radius: 5px;
  }
  
  .comment__body {
    position: relative;
  }
  .comment .rpm-rating-bar {
    height: 70px;
    top: 15px;
    left: -10px;
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
  }`);
    // process static posts
    processStories(document.querySelectorAll("article.story"));
    observer = new MutationObserver(mutationsListener);
    observer.observe(document.querySelector('.app__content, .main__inner'), {
        childList: true,
        subtree: true,
    });
}
window.addEventListener('load', main);
