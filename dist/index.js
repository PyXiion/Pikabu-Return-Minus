// ==UserScript==
// @name         Return Pikabu minus
// @version      0.6.14
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
                onSuccess: resolve,
            });
        });
    }
}
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
            const join = Object.values(data).sort().join(",");
            const toHash = [API_KEY, controller, ms, join].join(",");
            const hashed = MD5(toHash);
            return btoa(hashed);
        }
        getData() {
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
            this.videos = [];
            this.id = payload.story_id;
            this.pluses = payload.story_pluses ?? 0;
            this.minuses = payload.story_minuses ?? 0;
            this.rating = payload.story_digs ?? (this.pluses - this.minuses);
            this.parseData(payload.story_data);
        }
        parseData(dataArr) {
            for (let data of dataArr) {
                if (data.type.includes('v')) { // v means video (maybe)
                    data = data.data;
                    let urls = [];
                    let extensions = ['mp4', 'webm', 'av1'];
                    for (let ext of extensions) {
                        if (ext in data && data[ext].url) {
                            urls.push(data[ext].url);
                        }
                    }
                    this.videos.push(urls);
                }
            }
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
            this.videos = (payload.comment_desc.videos ?? []).flatMap((v) => v.url);
        }
    }
    Pikabu.Comment = Comment;
    class StoryData {
        constructor(payload) {
            this.story = "story" in payload ? new Post(payload.story) : null;
        }
    }
    Pikabu.StoryData = StoryData;
    class CommentsData extends StoryData {
        constructor(payload) {
            super(payload);
            this.selectedCommentId = 0;
            this.comments = payload.comments.map((x) => new Comment(x));
            this.hasMoreComments = payload.has_next_page_comments;
        }
    }
    Pikabu.CommentsData = CommentsData;
    let DataService;
    (function (DataService) {
        async function fetchStory(storyId, commentsPage) {
            const params = {
                story_id: storyId,
                page: commentsPage,
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
const isStoryPage = window.location.href.includes("/story/");
const currentStoryId = parseInt(["0", ...window.location.href.split('_')].pop());
const config = {
    debug: false,
    minStoryRating: 100,
    summary: true,
    filteringPageRegex: "^https?:\\/\\/pikabu.ru\\/(|best|companies)$",
    blockPaidAuthors: false,
    ratingBar: false,
    ratingBarComments: false,
    minRatesCountToShowRatingBar: 10,
    minusesPattern: null,
    minusesCommentPattern: null,
    ownCommentPattern: null,
    allCommentsLoadedNotification: false,
    unrollCommentariesAutomatically: false,
    videoDownloadButtons: true,
    socialLinks: true,
    commentVideoDownloadButtons: true,
    showBlockAuthorForeverButton: true,
    booleanOption(key) {
        config[key] = GM_config.get(key).valueOf();
    },
    update() {
        this.booleanOption("debug");
        config.minStoryRating = GM_config.get("minStoryRating").valueOf();
        this.booleanOption("summary");
        config.filteringPageRegex = GM_config.get("filteringPageRegex").valueOf();
        this.booleanOption("ratingBar");
        this.booleanOption("ratingBarComments");
        config.minRatesCountToShowRatingBar = GM_config.get("minRatesCountToShowRatingBar").valueOf();
        function makeEval(args, str, defaultFunc) {
            try {
                return new Function(args, "return " + str);
            }
            catch {
                return defaultFunc;
            }
        }
        config.minusesPattern = makeEval("story", GM_config.get("minusesPattern").valueOf().replace("%d", "story.minuses"), (story) => story.minuses);
        config.minusesCommentPattern = makeEval("comment", GM_config.get("minusesCommentPattern").valueOf().replace("%d", "comment.minuses"), (comment) => comment.minuses);
        config.ownCommentPattern = makeEval("comment", GM_config.get("ownCommentPattern").valueOf(), (comment) => (comment.pluses == 0 && comment.minuses == 0) ? 0 : `${comment.pluses}/${comment.minuses}`);
        this.booleanOption("unrollCommentariesAutomatically");
        this.booleanOption("videoDownloadButtons");
        this.booleanOption("showBlockAuthorForeverButton");
        this.booleanOption("allCommentsLoadedNotification");
        this.booleanOption("blockPaidAuthors");
        this.booleanOption("commentVideoDownloadButtons");
        this.booleanOption("socialLinks");
        enableFilters = new RegExp(config.filteringPageRegex).test(window.location.href);
    },
    formatMinuses(story) {
        return config.minusesPattern(story).toString();
    },
    formatCommentMinuses(comment) {
        return config.minusesCommentPattern(comment).toString();
    },
    formatOwnRating(comment) {
        return config.ownCommentPattern(comment).toString();
    },
};
let isConfigInit = false;
GM_config.init({
    id: "prm",
    title: (() => {
        const div = document.createElement('div');
        const p1 = document.createElement('p');
        p1.textContent = "Return Pikabu minus";
        const links = [];
        function addLink(text, url) {
            const link = document.createElement('a');
            link.href = url;
            link.textContent = text;
            links.push(link);
        }
        addLink("Телеграм", "https://t.me/return_pikabu");
        addLink("GitHub", "https://github.com/PyXiion/Pikabu-Return-Minus");
        div.append(p1, ...links);
        return div;
    })(),
    fields: {
        // ОБЩИЕ НАСТРОЙКИ
        summary: {
            section: [
                "Общие настройки",
            ],
            type: "checkbox",
            default: config.summary,
            label: "Отображение суммарного рейтинга у постов и комментариев.",
        },
        minRatesCountToShowRatingBar: {
            type: "int",
            default: config.minRatesCountToShowRatingBar,
            label: "Минимальное количество оценок у поста или комментария для отображения соотношения плюсов и минусов. " +
                "Установите на 0, чтобы всегда показывать.",
        },
        // НАСТРОЙКИ ПОСТОВ
        minStoryRating: {
            section: [
                "Настройки постов",
            ],
            type: "int",
            default: config.minStoryRating,
            label: "Посты с рейтингом ниже указанного будут удаляться из ленты. Вы сможете увидеть удалённые посты в списке просмотренных.",
        },
        ratingBar: {
            type: "checkbox",
            default: config.ratingBar,
            label: "Отображение соотношения плюсов и минусов у постов. При отсутствии оценок у поста будет показано соотношение 1:1.",
        },
        showBlockAuthorForeverButton: {
            type: "checkbox",
            default: config.showBlockAuthorForeverButton,
            label: "Отображение кнопки, которая блокирует автора поста навсегда. То есть добавляет в игнор-лист. " +
                "Вы должны быть авторизированы на сайте, иначе кнопка работать не будет.",
        },
        blockPaidAuthors: {
            type: "checkbox",
            default: config.blockPaidAuthors,
            label: "Удаляет из ленты посты от проплаченных авторов (которые с подпиской Пикабу+).",
        },
        videoDownloadButtons: {
            type: "checkbox",
            label: "Добавляет ко всем видео в постах ссылки на источники, если их возможно найти.",
            default: config.videoDownloadButtons,
        },
        socialLinks: {
            type: "checkbox",
            label: "Добавляет в начале заголовка поста значки Телеграма, ВК, Тиктока, если в посте есть соответствующие ссылки.",
            default: config.socialLinks
        },
        // НАСТРОЙКИ КОММЕНТАРИЕВ
        ratingBarComments: {
            section: [
                "Настройки комментариев",
            ],
            type: "checkbox",
            default: config.ratingBarComments,
            label: "Отображение соотношения плюсов и минусов у комментариев.",
        },
        unrollCommentariesAutomatically: {
            type: "checkbox",
            default: config.unrollCommentariesAutomatically,
            label: "Раскрывать все комментарии автоматически. Не рекомендую использовать со слабым интернетом."
        },
        allCommentsLoadedNotification: {
            type: "checkbox",
            default: config.allCommentsLoadedNotification,
            label: "Показывать уведомление о загрузке всех комментариев под постом."
        },
        commentVideoDownloadButtons: {
            type: "checkbox",
            default: config.commentVideoDownloadButtons,
            label: "Добавляет ко всем видео в комментариях ссылки на источники, если их возможно найти."
        },
        // БОЛЕЕ СЛОЖНЫЕ НАСТРОЙКИ
        filteringPageRegex: {
            section: ["Продвинутые настройки"],
            type: "text",
            label: "Страницы, на которых работает фильтрация по рейтингу (регулярное выражение).",
            default: config.filteringPageRegex,
        },
        minusesPattern: {
            type: "text",
            default: "story.minuses",
            label: "Шаблон отображения минусов у постов (JS). Пример: `story.minuses * 5000`. story: {id, rating, pluses, minuses}. Внутри может выполняться любой код, поэтому используйте с осторожностью.\n" +
                "Шаблоны гарантированно работают только на Tampermonkey.",
        },
        minusesCommentPattern: {
            type: "text",
            default: "comment.minuses",
            label: "Шаблон отображения минусов у комментариев (JS). Пример: `comment.minuses * 5000`. comment: {id, rating, pluses, minuses}.",
        },
        ownCommentPattern: {
            type: "text",
            default: "comment.pluses == 0 && comment.minuses == 0 ? 0 : comment.pluses == comment.minuses ? `+${comment.pluses} / -${comment.minuses}` : comment.pluses == 0 ? `-${comment.minuses}` : comment.minuses == 0 ? `+${comment.pluses}` : `+${comment.pluses} / ${comment.rating} / -${comment.minuses}`",
            label: "Шаблон отображения рейтинга у ВАШИХ комментариев (JS). Пример: `comment.minuses * 5000`. comment: {id, rating, pluses, minuses}.",
        },
        debug: {
            type: "checkbox",
            label: "Включить дополнительные логи в консоли. Для разработки и отладки.",
            default: config.debug
        },
    },
    events: {
        init() {
            isConfigInit = true;
        },
        save() {
            config.update();
        },
    },
    css: `
  #prm .config_header p { margin: 0; }
  #prm .config_header a { 
    font-size: medium; 
    margin: 0 10px;
  }
  #prm input { margin-right: 10px; }
  #prm input[type=text] {
    border: 1px solid #cccccc;
    border-radius: 10px;
    background: #ffffff !important;
    outline: none;
    height: 100%;
   font-family: Tahoma;
  }
  #prm .config_var { 
    margin: 10px 0;
    display: flex
  }
  #prm .config_var .field_label {
    padding-top: 4px;
  }
  `
});
const logPrefix = "[RPM]";
function info(...args) {
    if (config.debug) {
        console.info(logPrefix, ...args);
    }
}
function warn(...args) {
    if (config.debug) {
        console.warn(logPrefix, ...args);
    }
}
function error(...args) {
    if (config.debug) {
        console.error(logPrefix, ...args);
    }
}
const waitConfig = new Promise((resolve) => {
    let isInit = () => setTimeout(() => (isConfigInit ? resolve() : isInit()), 1);
    isInit();
});
const supportMenuCommands = GM.registerMenuCommand !== undefined;
GM.registerMenuCommand("Открыть настройки", () => {
    info("Открыты настройки.");
    GM_config.open();
});
function addCss(css) {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = css;
    // is added to the end of the body because it must override some of the original styles
    document.body.appendChild(styleSheet);
    info("Добавлен CSS");
}
class CommentData {
    constructor(data) {
        this.id = data.id;
        this.rating = data.rating;
        this.pluses = data.pluses;
        this.minuses = data.minuses;
        this.videos = data.videos;
    }
}
// Variables
const cachedComments = new Map();
let oldInterface = null;
const deferredComments = new Map();
const cachedPostVideos = new Map();
const blockIconTemplate = (function () {
    const div = document.createElement("div");
    div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__save"><use xlink:href="#icon--ui__ban"></use></svg>`;
    return div.firstChild;
})();
// UI functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function sendNotification(title, description, timeout = 2000) {
    function construct() {
        const notification = document.createElement('div');
        notification.classList.add('rpm-notification');
        const header = document.createElement('div');
        header.classList.add('rpm-notification-header');
        header.textContent = title;
        const content = document.createElement('div');
        content.classList.add('rpm-notification-content');
        content.textContent = description;
        notification.append(header, content);
        return notification;
    }
    const notification = construct();
    document.body.append(notification);
    const animationTime = 600.0;
    notification.style.animationDuration = `${animationTime / 1000.0}s`;
    notification.style.animationTimingFunction = "cubic-bezier(.18,.89,.32,1.28)";
    // Intro
    notification.style.animationName = "rpm-notification-intro";
    await sleep(animationTime);
    await sleep(timeout);
    // Outro
    notification.style.animationTimingFunction = "linear";
    notification.style.animationName = "rpm-notification-outro";
    notification.style.opacity = "0";
    await sleep(animationTime);
    // Remove
    notification.remove();
}
// Functions
async function blockAuthorForever(button, authorId) {
    button.disabled = true;
    // const fetch = unsafeWindow.fetch;
    try {
        await fetch(`https://pikabu.ru/ajax/ignore_actions.php?authors=${authorId}&story_id=0&period=forever&action=add_rule`, {
            method: "POST",
        });
        button.remove();
        info("Автор с ID", authorId, "заблокирован");
    }
    catch {
        button.disabled = false;
        error("Не получилось заблокировать автора с ID", authorId, ", возможно отсутствует Интернет-соединение");
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
    saveButton.parentElement.insertBefore(button, saveButton);
}
function processComment(comment) {
    const commentElem = document.getElementById(`comment_${comment.id}`);
    if (commentElem === null) {
        if (comment instanceof Pikabu.Comment) {
            cachedComments[comment.id] = new CommentData(comment);
            info('Закэшировал комментарий', comment.id);
        }
        return;
    }
    const userElem = commentElem.querySelector(".comment__user");
    const ratingDown = commentElem.querySelector(".comment__rating-down");
    if (!userElem || !ratingDown) {
        // Defer comment
        info('У комментария', comment.id, ' нет юзера или кнопок рейтинга, кэширую его');
        // setTimeout(() => processComment(comment), 400);
        cachedComments[comment.id] = (comment instanceof Pikabu.Comment) ? new CommentData(comment) : comment;
        return;
    }
    if (userElem.hasAttribute("data-own") &&
        userElem.getAttribute("data-own") === "true") {
        const textRatingElem = commentElem.querySelector(".comment__rating-count");
        textRatingElem.innerText = config.formatOwnRating(comment);
        info('Обработал "свой" комментарий', comment.id);
        return;
    }
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
    if (config.ratingBarComments &&
        totalRates >= config.minRatesCountToShowRatingBar) {
        let ratio = 0.5;
        if (totalRates > 0)
            ratio = comment.pluses / totalRates;
        addRatingBar(commentElem, ratio);
    }
    // Comment videos
    if (config.commentVideoDownloadButtons) {
        const videoElements = commentElem.querySelectorAll(':scope > .comment__body .comment-external-video');
        const videoCount = Math.min(videoElements.length, comment.videos.length);
        console.log(videoElements);
        for (let i = 0; i < videoCount; ++i) {
            const elem = videoElements[i];
            const url = comment.videos[i];
            const linkElem = document.createElement('a');
            linkElem.classList.add('rpm-download-video-button');
            linkElem.href = url;
            linkElem.text = 'Источник';
            linkElem.target = '_blank';
            elem.parentNode.insertBefore(linkElem, elem.nextSibling);
        }
    }
    info('Обработал комметарий', comment.id);
}
async function processStoryComments(storyId, storyData, page) {
    if (!isStoryPage || storyId != currentStoryId) {
        return;
    }
    for (const comment of storyData.comments) {
        processComment(comment);
    }
    if (storyData.hasMoreComments) {
        storyData = await Pikabu.DataService.fetchStory(storyId, page + 1);
        await processStoryComments(storyId, storyData, page + 1);
    }
    else if (config.allCommentsLoadedNotification) {
        sendNotification('Return Pikabu Minus', 'Все рейтинги комментариев загружены!');
    }
}
function addRatingBar(story, ratio) {
    const block = story.querySelector(".story__rating-block, .comment__body, .story__emotions");
    if (block !== null) {
        const bar = document.createElement("div");
        const inner = document.createElement("div");
        bar.append(inner);
        bar.classList.add("rpm-rating-bar");
        inner.classList.add("rpm-rating-bar-inner");
        inner.style.height = (ratio * 100).toFixed(1) + "%";
        block.prepend(bar);
    }
    else {
        // TODO mobile
    }
}
const linkTypes = [
    // Telegram
    {
        domains: [
            "t.me"
        ],
        iconHtml: `<svg xmlns="http://www.w3.org/2000/svg" class="rpm-story-icon icon icon--social__telegram"><use xlink:href="#icon--social__telegram"></use></svg>`,
        style: "fill: #24A1DE;",
    },
    // VK
    {
        domains: [
            "vk.com"
        ],
        iconHtml: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--social__vk"><use xlink:href="#icon--social__vk"></use></svg>`,
        style: "fill: black;",
    },
    // TIKTOK
    {
        domains: [
            "tiktok.com"
        ],
        iconHtml: `<svg class="icon" fill="#000000" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/></svg>`
    },
    // Boosty
    {
        domains: [
            "boosty.to"
        ],
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
        elem.classList.add('rpm-story-icon');
        // Add before the title
        const titleElem = story.querySelector('.story__title');
        titleElem.prepend(elem);
    }
    const linkElems = Array.from(story.querySelectorAll('.story__content a'));
    linkElems.reverse();
    // Iterate reversibly so that the last link is added to the icon list
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
function processOldStory(story, storyData) {
    let ratingElem = story.querySelector(".story__footer-rating > div");
    let isMobile = false;
    if (ratingElem !== null) {
        // mobile
        isMobile = true;
    }
    else {
        // pc
        ratingElem = story.querySelector(".story__left .story__rating-block");
    }
    if (ratingElem === null) {
        return false;
    }
    oldInterface = true;
    let ratingDown = ratingElem.querySelector(".story__rating-minus, .story__rating-down");
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
    }
    else {
        const minusesCounter = document.createElement("div");
        minusesCounter.classList.add("story__rating-count");
        minusesCounter.textContent = config.formatMinuses(storyData.story);
        ratingDown.prepend(minusesCounter);
    }
    if (config.summary) {
        const summary = document.createElement("div");
        if (isMobile)
            summary.classList.add("story__rating-rpm-count", "rpm-summary");
        else
            summary.classList.add("story__rating-count", "rpm-story-summary");
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
    // Block author button
    if (config.showBlockAuthorForeverButton) {
        addBlockButton(story);
    }
    // Links
    if (config.socialLinks) {
        checkStoryLinks(story);
    }
    // Block paid stories
    if (enableFilters &&
        config.blockPaidAuthors &&
        story.querySelector(".user__label[data-type=\"pikabu-plus\"]") !== null) {
        story.remove();
        info("Удалил пост", story, "как проплаченный:", `${config.blockPaidAuthors} = true`);
        return;
    }
    const storyId = parseInt(story.getAttribute("data-story-id"));
    // get story data
    const storyData = await Pikabu.DataService.fetchStory(storyId, 1);
    if (storyData === null || storyData === undefined) {
        warn("Не удалось получить пост #", storyId);
        return;
    }
    // delete the story if its ratings < the min rating
    if (enableFilters &&
        storyData.story.rating < config.minStoryRating) {
        story.remove();
        info("Удалил пост", story, "по фильтру рейтинга:", `storyData.story.rating < config.minStoryRating = ${storyData.story.rating} < ${config.minStoryRating} = true`);
        return;
    }
    // videos
    if (config.videoDownloadButtons)
        processPostVideos(story, storyData);
    processOldStory(story, storyData);
}
async function processStories(stories) {
    for (const story of stories) {
        processStory(story, false);
    }
}
function processCached(commentElem) {
    const commentId = parseInt(commentElem.getAttribute("data-id"));
    if (commentId in cachedComments) {
        processComment(cachedComments[commentId]);
        delete cachedComments[commentId];
    }
}
function processPostVideos(story, storyData) {
    function getPostPlayers() {
        return Array.from(story.querySelectorAll('.story-block_type_video'));
    }
    function createUrl(text, url) {
        const urlElem = document.createElement('a');
        urlElem.target = '_blank';
        urlElem.textContent = text;
        urlElem.href = url;
        return urlElem;
    }
    function addUrlToPlayer(videoBlock, urls) {
        const player = videoBlock.querySelector('.player');
        // to check video origin
        const dataType = player.getAttribute("data-type");
        const urlListElem = document.createElement('p');
        urlListElem.classList.add('rpm-video-list');
        // if it's a pikabu video
        if (dataType == "video-file") {
            for (const url of urls) {
                const extension = '.' + url.split('.').pop();
                urlListElem.appendChild(createUrl(extension, url));
            }
        }
        else {
            // try get video url
            const dataSource = player.getAttribute('data-source');
            if (dataSource)
                urlListElem.appendChild(createUrl('Источник', dataSource));
        }
        if (urlListElem.hasChildNodes())
            videoBlock.parentElement.insertBefore(urlListElem, videoBlock.nextSibling);
        else
            urlListElem.remove();
    }
    const playerElements = getPostPlayers();
    for (const i in storyData.story.videos) {
        const player = playerElements[i];
        const videoUrls = storyData.story.videos[i];
        addUrlToPlayer(player, videoUrls);
    }
}
function addVideoDownloadButtons(postId, url) {
    const videoControls = Array.from(document.querySelectorAll(`.story[data-story-id="${postId}"] .player__controls`));
    function addButton(link, videoControls) {
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
    const videos = cachedPostVideos[postId];
    for (const i in videoControls) {
        for (const url of videos[i]) {
            addButton(url, videoControls[i]);
        }
    }
}
function unrollComments(button) {
    info('Раскручиваю ' + button.querySelector('span').textContent);
    button.click();
    setTimeout(() => {
        if (document.body.contains(button)) {
            unrollComments(button);
        }
    }, 500);
}
function mutationsListener(mutationList, observer) {
    for (const mutation of mutationList) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement))
                continue;
            if (node.matches(".comment__header")) {
                const commentElem = node.closest(".comment");
                info('Поймал голову комментария!', commentElem);
                processCached(commentElem);
            }
            else if (node.matches("article.story")) {
                const storyElem = node;
                info('Поймал пост!', storyElem);
                processStory(storyElem, false);
            }
            else if (node.matches(".comment__more") && config.unrollCommentariesAutomatically) {
                const button = node;
                info('Поймал кнопку!', button);
                unrollComments(button);
            }
        }
    }
}
var observer = null;
function addSettingsOpenButton() {
    let block = 
    // mobile version
    document.querySelector('.footer__links .accordion')
        // else PC version
        ?? document.querySelector(".sidebar .sidebar__inner");
    if (block === null) {
        console.error("[RPM] Не удалось найти место для создания кнопки открытия настроек.");
        return;
    }
    const button = document.createElement('button');
    button.innerText = "Открыть настройки Return Pikabu minus";
    button.classList.add('rpm-open-settings-button');
    button.addEventListener('click', () => {
        button.disabled = true;
        GM_config.open();
        button.disabled = false;
    });
    block.appendChild(button);
}
async function main() {
    await waitConfig;
    config.update(); // Just in case.
    addCss(`.story__footer .story__rating-up {
  margin-right: 5px !important;
}
.prm-minuses {
  padding-left: 7px !important;
  margin: 0px !important;
}
.story__rating-count {
  margin: 7px 0 7px;
}
.rpm-story-summary {
  margin: 14px 0 4px;
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
}
.story__footer-tools-inner .rpm-block-author {
  overflow: visible;
  margin-right: auto;
  margin-left:8px;
  transform: scale(1.3);
}
.rpm-open-settings-button {
  margin-top: 10px;
  text-align: center;
  width: 100%;
  font-size: 0.9em;
}
.rpm-video-list {
  text-align: center;
}
.rpm-video-list a {
  margin: 0 5px;
}
.rpm-story-icon {
  width: 24px;
  height: 24px;
  padding: 0 4px;
  margin-right: 6px;
  vertical-align: text-top;
  border-radius: 3px;
}
.rpm-story-icon svg {
  margin-top: auto;
  padding: 2px 0px;
  width: 16px;
  height: 16px;
  margin: 0;
  transition: all ease 300ms;
}
.rpm-story-icon:hover svg {
  width: 18px;
  height: 18px;
}
#prm {
  border-radius: 10px;
}
@media only screen and (max-width: 768px)  {
  #prm {
    left: 2.5% !important;
    width: 100% !important;
  }
}  /* Notifications */
@keyframes rpm-notification-intro {
  from {
    translate: -100%;
  }
  to {
    translate: 0%;
  }
}
@keyframes rpm-notification-outro {
  from {
    translate: 0 0%;
    opacity: 1.0;
  }
  to {
    translate: 0 -200%;
    opacity: 0;
  }
}
.rpm-notification {
  position: fixed;
  bottom: 15px;
  left: 15px;
  z-index: 9999;
  overflow: hidden;
  max-width: 250px;
  background: var(--color-black-100);
  border-radius: 10px;
  border: 1px solid var(--color-black-440);
  pointer-events: none;
}
.rpm-notification * {
  padding: 5px 15px;
}
.rpm-notification-header {
  background: var(--color-primary-800);
  color: white;
  font-weight: bolder;
}
`);
    // process static posts
    processStories(document.querySelectorAll("article.story"));
    observer = new MutationObserver(mutationsListener);
    observer.observe(document.querySelector(".app__content, .main__inner"), {
        childList: true,
        subtree: true,
    });
    if (!supportMenuCommands)
        addSettingsOpenButton();
}
window.addEventListener("load", main);
