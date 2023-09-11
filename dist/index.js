// ==UserScript==
// @name         Return Pikabu minus
// @version      0.4.5
// @namespace    pikabu-return-minus.pyxiion.ru
// @description  Возвращает минусы на Pikabu, а также фильтрацию по рейтингу.
// @author       PyXiion
// @match        *://pikabu.ru/*
// @connect      api.pikabu.ru
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @require      https://greasyfork.org/scripts/452219-md5-%E5%87%BD%E6%95%B0/code/MD5%20%E5%87%BD%E6%95%B0.js?version=1099124
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
//#region Other Utils
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
//#region Extension
//#region Contants
const URL_PARAMS_COMMENT_ID = "cid";
const DOM_MAIN_QUERY = ".main, .main__content";
const DOM_HEADER_QUERY = "header.header";
const DOM_SIDEBAR_QUERY = ".sidebar-block.sidebar-block_border";
const DOM_CUSTOM_SIDEBAR_MIN_RATING_INPUT_ID = "min-rating";
const DOM_CUSTOM_SIDEBAR_SHOW_STORY_RATING_INPUT_ID = "show-story-rating";
const DOM_CUSTOM_SIDEBAR_SHOW_RATING_RATIO_INPUT_ID = "show-rating-ratio";
const DOM_CUSTOM_SIDEBAR_UPDATE_COMMENTS_INPUT_ID = "update-comments";
const DOM_STORY_QUERY = "article.story";
const DOM_STORY_LEFT_SIDEBAR_CLASS_QUERY = ".story__left";
const DOM_STORY_RATING_BLOCK_CLASS_QUERY = ".story__rating-block";
const DOM_STORY_RATING_COUNT_CLASS_QUERY = ".story__rating-count";
const DOM_STORY_RATING_TOTAL_CLASS_QUERY = ".pikabu-story-rating"; // custom
const DOM_STORY_RATING_BLOCK_UP_CLASS_QUERY = ".story__rating-plus";
const DOM_STORY_RATING_BLOCK_DOWN_CLASS_QUERY = ".story__rating-minus, .story__rating-down";
const DOM_MOBILE_STORY_RATING_FOOTER_CLASS_QUERY = ".story__footer-rating > div"; // it's wrapped
const DOM_COMMENT_ID = "comment_";
const DOM_COMMENT_CLASS_QUERY = ".comment";
const DOM_COMMENT_RATING_BLOCK_CLASS_QUERY = ".comment__rating";
const DOM_COMMENT_HEADER_CLASS_QUERY = ".comment__header";
const DOM_COMMENT_BODY_CLASS_QUERY = ".comment__body";
const DOM_COMMENT_HEADER_USER_CLASS_QUERY = ".comment__user";
const DOM_COMMENT_HEADER_RATING_UP_CLASS_QUERY = ".comment__rating-up";
const DOM_COMMENT_HEADER_RATING_CLASS_QUERY = ".comment__rating-count";
const DOM_COMMENT_HEADER_RATING_DOWN_CLASS_QUERY = ".comment__rating-down";
const DOM_COMMENT_HEADER_RATING_TOTAL_CLASS_QUERY = ":scope > .comment__rating-count";
const DOM_COMMENT_OWN_HEADER_RATING_COUNT_CLASS_QUERY = ".comment__rating-count";
const ATTRIBUTE_MARK_EDITED = "pikabu-return-minus";
const ATTRIBUTE_STORY_ID = "data-story-id";
const ATTIRUBE_RATING_COUNT = "data-rating";
const ATTIRUBE_MINUSES_COUNT = "data-minuses";
const HTML_SRC_STORY_RATING_BAR = '<div class="pikabu-rating-bar-vertical-pluses"></div>';
const HTML_SRC_MOBILE_STORY_RATING = '<span class="story__rating-count">${rating}</span>';
const HTML_SRC_MOBILE_STORY_BUTTON_MINUS = '<span class="story__rating-count">${minuses}</span><span type="button" class="tool story__rating-down" data-role="rating-down"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__rating-down icon--ui__rating-down_story"><use xlink:href="#icon--ui__rating-down"></use></svg></span>';
const HTML_SRC_COMMENT_BUTTON_UP = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--comments-next__rating-up icon--comments-next__rating-up_comments"><use xlink:href="#icon--comments-next__rating-up"></use></svg><div class="comment__rating-count">${pluses}</div>';
const HTML_SRC_COMMENT_BUTTON_DOWN = '<div class="comment__rating-count">${-minuses}</div><svg xmlns="http://www.w3.org/2000/svg" class="icon icon--comments-next__rating-down icon--comments-next__rating-down_comments"><use xlink:href="#icon--comments-next__rating-down"></use></svg>';
const HTML_SRC_SIDEBAR = '<div class="sidebar-block__content"><details><summary>Return Pikabu Minus</summary><label for="rating">Минимальный рейтинг:</label><input type="number" id="min-rating" name="rating" value="0" step="10" class="input input_editor profile-block input__box settings-main__label" min="-100" max="300"><div><input type="checkbox" name="show-story-rating" id="show-story-rating"><label for="show-story-rating">Показывать суммарный рейтинг у постов</label></div><div><input type="checkbox" name="show-rating-ratio" id="show-rating-ratio"><label for="show-rating-ratio">Показывать соотношение рейтинга</label></div><div><input type="checkbox" name="update-comments" id="update-comments"><label for="update-comments">Обрабатывать рейтинг комментариев</label></div><a class="social-icon social-icon_square" href="https://t.me/return_pikabu" data-type="telegram"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon--social__telegram"><use xlink:href="#icon--social__telegram"></use></svg></a></details></div>';
const HTML_STORY_MINUSES_RATING = document.createElement("div");
HTML_STORY_MINUSES_RATING.className = "story__rating-count";
const HTML_STORY_RATING = HTML_STORY_MINUSES_RATING.cloneNode();
HTML_STORY_RATING.classList.add("pikabu-story-rating");
const HTML_STORY_RATING_BAR = document.createElement("div");
HTML_STORY_RATING_BAR.className = "pikabu-rating-bar-vertical";
HTML_STORY_RATING_BAR.innerHTML = HTML_SRC_STORY_RATING_BAR;
const HTML_MOBILE_STORY_BUTTON_MINUS = document.createElement("button");
HTML_MOBILE_STORY_BUTTON_MINUS.className = "story__rating-minus";
HTML_MOBILE_STORY_BUTTON_MINUS.innerHTML = HTML_SRC_MOBILE_STORY_BUTTON_MINUS;
const HTML_COMMENT_RATING_BAR = document.createElement("div");
HTML_COMMENT_RATING_BAR.className = "pikabu-rating-bar-vertical-comment";
HTML_COMMENT_RATING_BAR.innerHTML = HTML_SRC_STORY_RATING_BAR; // not a mistake
const HTML_COMMENT_BUTTON_UP = document.createElement("div");
HTML_COMMENT_BUTTON_UP.className = "comment__rating-up green-is-not-red";
HTML_COMMENT_BUTTON_UP.innerHTML = HTML_SRC_COMMENT_BUTTON_UP;
const HTML_COMMENT_RATING = document.createElement("div");
HTML_COMMENT_RATING.className = "comment__rating-count custom-comments-counter";
const HTML_COMMENT_BUTTON_DOWN = document.createElement("div");
HTML_COMMENT_BUTTON_DOWN.className = "comment__rating-down";
HTML_COMMENT_BUTTON_DOWN.innerHTML = HTML_SRC_COMMENT_BUTTON_DOWN;
const HTML_CUSTOM_SIDEBAR = document.createElement("div");
const EXTRA_CSS = `
.story__rating-down:hover .story__rating-count {
  color:var(--color-danger-800)
}
.story__rating-count {
  margin: 7px 0 7px;
}
.custom-comments-counter {
  margin-right: 8px;
}
.comment__rating-down .comment__rating-count {
  margin-right: 8px;
}
.comment__rating-down {
  padding: 2px 8px;
}

.pikabu-rating-bar-vertical {
  position: absolute;
  right: -8px;
  width: 4px;
  height: 100%;
  background: var(--color-danger-800);
  border-radius: 15px;
}
.pikabu-rating-bar-vertical-pluses {
  position: absolute;
  width: 100%;
  background-color: var(--color-primary-700);
  border-radius: 15px;
}

.comment__body {
  position: relative;
}
.pikabu-rating-bar-vertical-comment {
  position: absolute;
  background-color: var(--color-danger-800);
  width: 3px;
  bottom: 20px;
  left: -8px;
  top: 20px;
  max-height: 100px;
}

/* mobile only */
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
}

.story__rating-minus .story__rating-count {
  padding: 0 1px 0 10px;
}

.story__footer-rating {
  position: relative;
}
.story__footer-rating .pikabu-rating-bar-vertical {
  left: -8px;
}`;
//#endregion
class Settings {
    constructor() {
        this.minRating = 0;
        this.showStoryRating = true;
        this.updateComments = true;
        this.showRatingRatio = true;
    }
    save() {
        GM.setValue("settings", JSON.stringify(this));
    }
    static async load() {
        const settings = await GM.getValue("settings");
        if (settings === undefined || settings === null || typeof settings !== "string")
            return new Settings();
        return Object.assign(new Settings(), JSON.parse(settings));
    }
}
class PostElement {
    constructor(storyElem, settings) {
        this.storyElem = storyElem;
        this.settings = settings;
        this.id = parseInt(storyElem.getAttribute(ATTRIBUTE_STORY_ID));
        this.isEdited = storyElem.hasAttribute(ATTRIBUTE_MARK_EDITED);
        storyElem.setAttribute(ATTRIBUTE_MARK_EDITED, "true");
        // check is mobile
        if (PostElement.isMobile === null) {
            const ratingFooterElem = storyElem.querySelector(DOM_MOBILE_STORY_RATING_FOOTER_CLASS_QUERY);
            PostElement.isMobile = ratingFooterElem !== null;
        }
        this.parseAndModify();
    }
    parseAndModify() {
        if (PostElement.isMobile) {
            this.ratingBlockElem = this.storyElem.querySelector(DOM_MOBILE_STORY_RATING_FOOTER_CLASS_QUERY);
        }
        else {
            this.leftSidebarElem = this.storyElem.querySelector(DOM_STORY_LEFT_SIDEBAR_CLASS_QUERY);
            if (this.leftSidebarElem === null)
                return;
            this.ratingBlockElem = this.leftSidebarElem.querySelector(DOM_STORY_RATING_BLOCK_CLASS_QUERY);
        }
        this.ratingUpElem = this.ratingBlockElem.querySelector(DOM_STORY_RATING_BLOCK_UP_CLASS_QUERY);
        this.ratingDownElem = this.ratingBlockElem.querySelector(DOM_STORY_RATING_BLOCK_DOWN_CLASS_QUERY);
        if (this.isEdited) {
            this.ratingUpCounter = this.ratingUpElem.querySelector(DOM_STORY_RATING_COUNT_CLASS_QUERY);
            this.ratingDownCounter = this.ratingDownElem.querySelector(DOM_STORY_RATING_COUNT_CLASS_QUERY);
            if (this.settings.showStoryRating)
                this.ratingCounter = this.ratingBlockElem.querySelector(DOM_STORY_RATING_TOTAL_CLASS_QUERY);
        }
        else {
            if (this.settings.showStoryRating) {
                this.ratingElem = HTML_STORY_RATING.cloneNode(true);
                this.ratingBlockElem.insertBefore(this.ratingElem, this.ratingDownElem);
                this.ratingCounter = this.ratingElem;
            }
            if (PostElement.isMobile) {
                const newButton = HTML_MOBILE_STORY_BUTTON_MINUS.cloneNode(true);
                this.ratingDownElem.replaceWith(newButton);
                this.ratingDownElem = newButton;
                this.ratingDownCounter = this.ratingDownElem.querySelector(DOM_STORY_RATING_COUNT_CLASS_QUERY);
            }
            else {
                this.ratingDownCounter = HTML_STORY_MINUSES_RATING.cloneNode(true);
                this.ratingDownElem.prepend(this.ratingDownCounter);
            }
            this.ratingUpCounter = this.ratingUpElem.querySelector(DOM_STORY_RATING_COUNT_CLASS_QUERY);
        }
        if (this.settings.showRatingRatio)
            this.addRatingBar();
        this.isEdited = true;
    }
    addRatingBar() {
        this.ratingBarElem = HTML_STORY_RATING_BAR.cloneNode(true);
        this.ratingBarInnerElem = this.ratingBarElem.firstChild;
        // hide the element until the ratio is set
        this.ratingBarElem.style.display = "none";
        this.ratingBlockElem.prepend(this.ratingBarElem);
    }
    /**
     * @param ratio from 0 to 1. pluses/total
     */
    updateRatingBar(ratio) {
        // show element
        this.ratingBarElem.style.display = "";
        ratio = Math.round(ratio * 100);
        this.ratingBarInnerElem.style.height = `${ratio}%`;
    }
    setRating(pluses, rating, minuses) {
        if (!this.isEdited)
            return;
        this.ratingUpCounter.innerText = `${pluses}`;
        this.ratingDownCounter.innerText = `${-minuses}`;
        if (this.settings.showStoryRating)
            this.ratingCounter.innerText = `${rating}`;
        if (pluses + minuses !== 0 && this.settings.showRatingRatio)
            this.updateRatingBar(pluses / (pluses + minuses));
    }
    getId() {
        return this.id;
    }
}
PostElement.isMobile = null;
class CommentElement {
    constructor(commentElem, settings) {
        this.commentElem = commentElem;
        this.settings = settings;
        this.parseAndModify();
    }
    parseAndModify() {
        this.bodyElem = this.commentElem.querySelector(DOM_COMMENT_BODY_CLASS_QUERY);
        this.headerElem = this.bodyElem.querySelector(DOM_COMMENT_HEADER_CLASS_QUERY);
        if (PostElement.isMobile) {
            this.ratingBlockElem = this.bodyElem.querySelector(DOM_COMMENT_RATING_BLOCK_CLASS_QUERY);
        }
        else {
            this.ratingBlockElem = this.headerElem;
        }
        // check is already edited
        this.isEdited = this.commentElem.hasAttribute(ATTRIBUTE_MARK_EDITED);
        this.commentElem.setAttribute(ATTRIBUTE_MARK_EDITED, "true");
        this.userElem = this.headerElem.querySelector(DOM_COMMENT_HEADER_USER_CLASS_QUERY);
        this.isOwn = this.userElem.hasAttribute("data-own")
            && this.userElem.getAttribute("data-own") === "true";
        // delete plus counter
        if (this.isOwn && !this.isEdited) {
            const ratingCountElem = this.commentElem.querySelector(DOM_COMMENT_OWN_HEADER_RATING_COUNT_CLASS_QUERY);
            if (ratingCountElem !== null)
                ratingCountElem.remove();
        }
        if (this.isEdited)
            this.ratingElem = this.ratingBlockElem.querySelector(DOM_COMMENT_HEADER_RATING_TOTAL_CLASS_QUERY);
        else
            this.ratingElem = HTML_COMMENT_RATING.cloneNode(true);
        if (this.isOwn && !this.isEdited) {
            // create new buttons and counter
            this.ratingUpElem = HTML_COMMENT_BUTTON_UP.cloneNode(true);
            this.ratingDownElem = HTML_COMMENT_BUTTON_DOWN.cloneNode(true);
            this.ratingBlockElem.prepend(this.ratingUpElem, this.ratingElem, this.ratingDownElem);
        }
        else {
            // update buttons
            this.ratingUpElem = this.ratingBlockElem.querySelector(DOM_COMMENT_HEADER_RATING_UP_CLASS_QUERY);
            this.ratingDownElem = this.ratingBlockElem.querySelector(DOM_COMMENT_HEADER_RATING_DOWN_CLASS_QUERY);
            if (!this.isEdited) {
                // add counter
                this.ratingBlockElem.insertBefore(this.ratingElem, this.ratingDownElem);
                this.ratingUpElem.innerHTML = HTML_SRC_COMMENT_BUTTON_UP;
                this.ratingDownElem.innerHTML = HTML_SRC_COMMENT_BUTTON_DOWN;
            }
        }
        this.ratingUpCounterElem = this.ratingUpElem.querySelector(DOM_COMMENT_HEADER_RATING_CLASS_QUERY);
        this.ratingCounterElem = this.ratingElem;
        this.ratingDownCounterElem = this.ratingDownElem.querySelector(DOM_COMMENT_HEADER_RATING_CLASS_QUERY);
        if (this.settings.showRatingRatio)
            this.addRatingBar();
        this.isEdited = true;
    }
    addRatingBar() {
        this.ratingBarElem = HTML_COMMENT_RATING_BAR.cloneNode(true);
        this.ratingBarInnerElem = this.ratingBarElem.firstChild;
        // hide the element until the ratio is set
        this.ratingBarElem.style.display = "none";
        this.bodyElem.prepend(this.ratingBarElem);
    }
    /**
     * @param ratio from 0 to 1. pluses/total
     */
    updateRatingBar(ratio) {
        // show the element
        this.ratingBarElem.style.display = "block";
        this.ratingBarInnerElem.style.height = `${ratio * 100}%`;
    }
    setRating(pluses, rating, minuses) {
        if (!this.isEdited)
            return;
        this.ratingUpCounterElem.innerText = `${pluses}`; // no need
        this.ratingCounterElem.innerText = `${rating}`;
        this.ratingDownCounterElem.innerText = `${-minuses}`;
        if (pluses + minuses !== 0 && this.settings.showRatingRatio)
            this.updateRatingBar(pluses / (pluses + minuses));
    }
}
class SidebarElement {
    constructor(settings, isMobile) {
        this.settings = settings;
        this.sidebarElem = document.createElement("div");
        this.sidebarElem.className = "sidebar-block sidebar-block_border sidebar-block__content menu menu_vertical";
        this.sidebarElem.innerHTML = HTML_SRC_SIDEBAR;
        if (isMobile) {
            const headerElem = document.querySelector(DOM_HEADER_QUERY);
            headerElem.parentNode.prepend(this.sidebarElem);
        }
        else {
            const sidebarElem = document.querySelector(DOM_SIDEBAR_QUERY);
            sidebarElem.parentNode.prepend(this.sidebarElem);
        }
        this.minRatingInput = document.getElementById(DOM_CUSTOM_SIDEBAR_MIN_RATING_INPUT_ID);
        this.minRatingInput.addEventListener("change", this.minRatingChange.bind(this));
        this.minRatingInput.value = `${this.settings.minRating}`;
        this.showStoryRatingInput = document.getElementById(DOM_CUSTOM_SIDEBAR_SHOW_STORY_RATING_INPUT_ID);
        this.showStoryRatingInput.addEventListener("change", this.updateCheckboxChange.bind(this, (x) => this.settings.showStoryRating = x));
        this.showStoryRatingInput.checked = this.settings.showStoryRating;
        this.showRatingRatioInput = document.getElementById(DOM_CUSTOM_SIDEBAR_SHOW_RATING_RATIO_INPUT_ID);
        this.showRatingRatioInput.addEventListener("change", this.updateCheckboxChange.bind(this, (x) => this.settings.showRatingRatio = x));
        this.showRatingRatioInput.checked = this.settings.showRatingRatio;
        this.updateCommentsInput = document.getElementById(DOM_CUSTOM_SIDEBAR_UPDATE_COMMENTS_INPUT_ID);
        this.updateCommentsInput.addEventListener("change", this.updateCommentsChange.bind(this));
        this.updateCommentsInput.checked = this.settings.updateComments;
    }
    minRatingChange(event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement))
            return;
        this.settings.minRating = parseInt(target.value);
        this.settings.save();
    }
    updateCheckboxChange(setter, event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement))
            return;
        setter(target.checked);
        this.settings.save();
    }
    updateCommentsChange(event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement))
            return;
        this.settings.updateComments = target.checked;
        this.settings.save();
    }
}
class ReturnPikabuMinus {
    constructor() {
        window.addEventListener("load", this.onLoad.bind(this));
        this.commentsToUpdate = [];
        this.isStoryPage = window.location.href.includes("/story/");
        this.isMustFilterByRating = /^https?:\/\/pikabu.ru\/(|best|new|communities|companies)$/.test(window.location.href);
    }
    addStyle(css) {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = css;
        // is added to the end of the body because it must override some of the original styles
        document.body.appendChild(styleSheet);
    }
    async onLoad() {
        this.addStyle(EXTRA_CSS);
        this.settings = await Settings.load();
        this.isMobile = this.checkIsMobile();
        PostElement.isMobile = this.isMobile;
        this.sidebar = new SidebarElement(this.settings, this.isMobile);
        this.mutationObserver = new MutationObserver(this.observeMutations.bind(this));
        const mainElem = document.querySelector(DOM_MAIN_QUERY);
        this.mutationObserver.observe(mainElem, {
            childList: true,
            subtree: true
        });
        this.processStaticPosts();
    }
    // from https://greasyfork.org/ru/scripts/468458-pikabu-purifier/code
    checkIsMobile() {
        const scriptElements = document.getElementsByTagName("script");
        for (let i = 0; i < scriptElements.length; i++) {
            const scriptSrc = scriptElements[i].src;
            if (scriptSrc) {
                if (scriptSrc.includes('mobile')) {
                    return true;
                }
            }
        }
        return false;
    }
    observeMutations(mutations, observer) {
        let commentAdded = false;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement))
                    continue;
                // It is the header that is checked, since the comment may be in 
                // the loading state (at this time the header will be absent)
                if (node.matches(DOM_COMMENT_HEADER_CLASS_QUERY)) {
                    commentAdded = true;
                }
                else if (node.matches(DOM_STORY_QUERY)) {
                    this.processStoryElement(node);
                }
            }
        }
        if (commentAdded)
            this.processCachedComments();
    }
    async processCachedComments() {
        const results = await Promise.all(this.commentsToUpdate.map(this.processComment.bind(this)));
        this.commentsToUpdate = this.commentsToUpdate.filter((_v, index) => !results[index]);
    }
    async processComment(comment) {
        const commentHtmlElem = document.getElementById(DOM_COMMENT_ID + comment.id);
        if (commentHtmlElem === null) {
            this.commentsToUpdate.push(comment);
            return false;
        }
        const commentElem = new CommentElement(commentHtmlElem, this.settings);
        commentElem.setRating(comment.pluses, comment.rating, comment.minuses);
        return true;
    }
    processStaticPosts() {
        const posts = document.querySelectorAll(DOM_STORY_QUERY);
        for (const post of posts) {
            this.processStoryElement(post);
        }
    }
    async processStoryElement(storyElem) {
        const post = new PostElement(storyElem, this.settings);
        const postData = await Pikabu.DataService.fetchStory(post.getId(), 1);
        post.setRating(postData.story.pluses, postData.story.rating, postData.story.minuses);
        if (this.isStoryPage && this.settings.updateComments) {
            await this.processStoryComments(postData);
        }
        else if (this.isMustFilterByRating) {
            if (postData.story.rating < this.settings.minRating) {
                storyElem.remove();
            }
        }
    }
    async processStoryComments(commentsData) {
        const storyId = commentsData.story.id;
        let page = 1;
        while (commentsData.comments.length > 0) {
            const promises = [];
            for (const comment of commentsData.comments) {
                promises.push(this.processComment(comment));
            }
            await Promise.all(promises);
            page += 1;
            commentsData = await Pikabu.DataService.fetchStory(storyId, page);
        }
    }
}
var rpm = new ReturnPikabuMinus();
//#endregion
