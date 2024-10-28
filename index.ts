// ==UserScript==
// @name         Return Pikabu minus
// @version      0.7.6
// @namespace    pikabu-return-minus.pyxiion.ru
// @description  Возвращает минусы на Pikabu, а также фильтрацию по рейтингу.
// @author       PyXiion
// @match        *://pikabu.ru/*
// @connect      api.pikabu.ru
// @connect      pikabu.ru
// @connect      rpm.pyxiion.ru
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @license      MIT
// ==/UserScript==


//#region Utils


function MD5(string) {
      
  function RotateLeft(lValue, iShiftBits) {
      return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
  }

  function AddUnsigned(lX,lY) {
      var lX4,lY4,lX8,lY8,lResult;
      lX8 = (lX & 0x80000000);
      lY8 = (lY & 0x80000000);
      lX4 = (lX & 0x40000000);
      lY4 = (lY & 0x40000000);
      lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
      if (lX4 & lY4) {
          return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      }
      if (lX4 | lY4) {
          if (lResult & 0x40000000) {
              return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
          } else {
              return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
          }
      } else {
          return (lResult ^ lX8 ^ lY8);
      }
  }

  function F(x,y,z) { return (x & y) | ((~x) & z); }
  function G(x,y,z) { return (x & z) | (y & (~z)); }
  function H(x,y,z) { return (x ^ y ^ z); }
  function I(x,y,z) { return (y ^ (x | (~z))); }

  function FF(a,b,c,d,x,s,ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
  };

  function GG(a,b,c,d,x,s,ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
  };

  function HH(a,b,c,d,x,s,ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
  };

  function II(a,b,c,d,x,s,ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
  };

  function ConvertToWordArray(string) {
      var lWordCount;
      var lMessageLength = string.length;
      var lNumberOfWords_temp1=lMessageLength + 8;
      var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
      var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
      var lWordArray=Array(lNumberOfWords-1);
      var lBytePosition = 0;
      var lByteCount = 0;
      while ( lByteCount < lMessageLength ) {
          lWordCount = (lByteCount-(lByteCount % 4))/4;
          lBytePosition = (lByteCount % 4)*8;
          lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
          lByteCount++;
      }
      lWordCount = (lByteCount-(lByteCount % 4))/4;
      lBytePosition = (lByteCount % 4)*8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
      lWordArray[lNumberOfWords-2] = lMessageLength<<3;
      lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
      return lWordArray;
  };

  function WordToHex(lValue) {
      var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
      for (lCount = 0;lCount<=3;lCount++) {
          lByte = (lValue>>>(lCount*8)) & 255;
          WordToHexValue_temp = "0" + lByte.toString(16);
          WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
      }
      return WordToHexValue;
  };

  function Utf8Encode(string) {
      string = string.replace(/\r\n/g,"\n");
      var utftext = "";

      for (var n = 0; n < string.length; n++) {

          var c = string.charCodeAt(n);

          if (c < 128) {
              utftext += String.fromCharCode(c);
          }
          else if((c > 127) && (c < 2048)) {
              utftext += String.fromCharCode((c >> 6) | 192);
              utftext += String.fromCharCode((c & 63) | 128);
          }
          else {
              utftext += String.fromCharCode((c >> 12) | 224);
              utftext += String.fromCharCode(((c >> 6) & 63) | 128);
              utftext += String.fromCharCode((c & 63) | 128);
          }

      }

      return utftext;
  };

  var x=Array();
  var k,AA,BB,CC,DD,a,b,c,d;
  var S11=7, S12=12, S13=17, S14=22;
  var S21=5, S22=9 , S23=14, S24=20;
  var S31=4, S32=11, S33=16, S34=23;
  var S41=6, S42=10, S43=15, S44=21;

  string = Utf8Encode(string);

  x = ConvertToWordArray(string);

  a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

  for (k=0;k<x.length;k+=16) {
      AA=a; BB=b; CC=c; DD=d;
      a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
      d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
      c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
      b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
      a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
      d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
      c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
      b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
      a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
      d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
      c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
      b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
      a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
      d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
      c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
      b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
      a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
      d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
      c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
      b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
      a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
      d=GG(d,a,b,c,x[k+10],S22,0x2441453);
      c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
      b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
      a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
      d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
      c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
      b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
      a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
      d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
      c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
      b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
      a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
      d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
      c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
      b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
      a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
      d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
      c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
      b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
      a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
      d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
      c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
      b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
      a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
      d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
      c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
      b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
      a=II(a,b,c,d,x[k+0], S41,0xF4292244);
      d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
      c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
      b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
      a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
      d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
      c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
      b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
      a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
      d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
      c=II(c,d,a,b,x[k+6], S43,0xA3014314);
      b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
      a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
      d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
      c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
      b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
      a=AddUnsigned(a,AA);
      b=AddUnsigned(b,BB);
      c=AddUnsigned(c,CC);
      d=AddUnsigned(d,DD);
  }

  var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);

  return temp.toLowerCase();
}


//#endregion

//#region Networking

type HttpMethod = "POST" | "GET";

interface HttpRequestCallback {
  onError(response: GM.Response<undefined>): void;
  onSuccess(response: GM.Response<undefined>): void;
}

abstract class AbstractHttpRequest {
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

  protected abstract getData(): any;

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
    const promise = new Promise<GM.Response<undefined>>((resolve, reject) => {
      this.execute({
        onError: reject,
        onSuccess: resolve,
      });
    });
    promise.catch(console.error);
    return promise;
  }
}

class HttpRequest extends AbstractHttpRequest {
  protected body: any;

  public constructor(url: string) {
    super(url);
    this.addHeader("Content-Type", "application/json");
  }

  public setBody(body: any) {
    this.body = body;
  }

  protected getData() {
    return this.body;
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

  class Request extends AbstractHttpRequest {
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
    public videos: string[][] = [];

    public constructor(payload: PikabuJson.Story) {
      super();
      this.id = payload.story_id;
      this.pluses = payload.story_pluses ?? 0;
      this.minuses = payload.story_minuses ?? 0;
      this.rating = payload.story_digs ?? (this.pluses - this.minuses);

      this.parseData(payload.story_data)
    }

    private parseData(dataArr: any) {
      for (let data of dataArr) {
        if ((data.type as string).includes('v')) { // v means video (maybe)
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

  export class Comment extends RatingObject {
    public parentId: number;
    public videos: string[];

    public constructor(payload: PikabuJson.Comment) {
      super();
      this.id = payload.comment_id;
      this.parentId = payload.parent_id;
      this.rating = payload.comment_rating ?? 0;
      this.pluses = payload.comment_pluses ?? 0;
      this.minuses = payload.comment_minuses ?? 0;
      this.videos = (payload.comment_desc.videos ?? []).flatMap((v) => v.url);
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
    public hasMoreComments: boolean;

    public constructor(payload: PikabuJson.StoryGetResponse) {
      super(payload);
      this.selectedCommentId = 0;
      this.comments = payload.comments.map((x) => new Comment(x));
      this.hasMoreComments = payload.has_next_page_comments;
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




//#region RPM API/Nodes

namespace RPM {
  export namespace Service {
    const DOMAIN = 'https://rpm.pyxiion.ru/'

    const USER_REQUEST_QUEUE_PERIOD = 300;
    const USER_REQUEST_QUEUE_AT_ONCE = 50;

    export function isAuthorized() {
      return config.uuid !== '';
    }

    export async function register() {
      const response = (await post(DOMAIN + 'register', {})) as RpmJson.RegisterResponse;
      return response.secret;
    }

    interface UserInfoRequest {
      callback: (info: RpmJson.UserInfo) => void;
    }

    const userInfoRequestQueue: Map<number, UserInfoRequest[]> = new Map();
    let isQueueRunning = false;

    export function getUserInfo(id: number): Promise<RpmJson.UserInfo> {
      return new Promise((resolve) => {
        if (!userInfoRequestQueue.has(id)) {
          userInfoRequestQueue.set(id, [{ callback: resolve }]);
        } else {
          userInfoRequestQueue.get(id)!.push({ callback: resolve });
        }
    
        setTimeout(workQueue, USER_REQUEST_QUEUE_PERIOD);
      });
    }
    

    async function getBunchOfUserInfo(ids: number[]) {
      const body: RpmJson.InfoBunchRequest = { ids }
      if (config.uuid) body.user_uuid = config.uuid;

      const response = (await post(DOMAIN + 'user/info_bunch', body)) as RpmJson.InfoBunchResponse;

      const users = response.users;
      for (const id in users) {
        postprocessUserInfo(users[id]);
      }

      return users;
    }

    async function workQueue() {
      if (userInfoRequestQueue.size === 0 || isQueueRunning)
        return;
  
      isQueueRunning = true;
    
      // Извлекаем до N уникальных запросов из очереди
      const requestsToProcess = Array.from(userInfoRequestQueue.keys()).slice(0, USER_REQUEST_QUEUE_AT_ONCE);
      const ids = requestsToProcess;
    
      try {
        const usersInfo = await getBunchOfUserInfo(ids);
    
        // Вызываем все callback для каждого запроса
        requestsToProcess.forEach(id => {
          const userRequests = userInfoRequestQueue.get(id);
          if (userRequests) {
            const info = usersInfo[id] || null; // null если инфо не найдено
            userRequests.forEach(req => req.callback(info));
          }
          userInfoRequestQueue.delete(id); // Удаляем обработанные запросы
        });
      } catch (error) {
        console.error("Error processing user info requests:", error);
      } finally {
        isQueueRunning = false;
      }
    
      // Повторный запуск, если есть еще запросы
      setTimeout(workQueue, USER_REQUEST_QUEUE_PERIOD);
    }


    function postprocessUserInfo(info: RpmJson.UserInfo) {
      if (info.own_vote) {
        // Removes own vote from other votes
        info.pluses -= info.own_vote === 1 ? 1 : 0;
        info.minuses -= info.own_vote === -1 ? 1 : 0;
      }
    }

    export function voteUser(id: number, vote: [-1, 0, 1]) {
      if (!isAuthorized())
        return null;
      return post(DOMAIN + `user/${id}/vote`, {user_uuid: config.uuid, vote} );
    }

    async function post(url: string, json: Object): Promise<Object> {
      const request = new HttpRequest(url);
      request.setBody(json);
      const response = await request.executeAsync();
      return response.response;
    }
  }

  export namespace Nodes {

    export function createUserRatingNode(uid: number, infoConsumer: (info: RpmJson.UserInfo) => void = null) {
      const elem = document.createElement('div');
      elem.classList.add('rpm-user-rating', 'hint', 'rpm-not-ready', `rpm-user-rating-${uid}`);

      elem.setAttribute('aria-label', 'Рейтинг автора в RPM');
      elem.setAttribute('pikabu-user-id', uid.toString());

      function addSpan(cls: string) {
        const e = document.createElement('span');
        e.className = cls;
        elem.appendChild(e);

        e.innerText = '0';

        return e;
      }

      const loadingIcon = document.createElement('div');
      loadingIcon.classList.add('rpm-loading');
      elem.appendChild(loadingIcon);
      
      const plusElem = addSpan("rpm-pluses");
      addSpan("rpm-rating");
      const minusElem = addSpan("rpm-minuses");

      if (Service.isAuthorized()) {
        plusElem.addEventListener('click', () => UserRating.voteCallback(elem, uid, 1));
        minusElem.addEventListener('click', () => UserRating.voteCallback(elem, uid, -1));
      }

      UserRating.updateUserRatingElemAsync(elem, infoConsumer);

      return elem;
    }

    namespace UserRating {
      const userCache: Map<number, RpmJson.UserInfo> = new Map();

      function updateUserRatingElem(elem: HTMLDivElement, info: RpmJson.UserInfo) {
        const pluses = info.pluses + (info.own_vote === 1 ? 1 : 0);
        const minuses = info.minuses + (info.own_vote === -1 ? 1 : 0);
        const rating = pluses - minuses + info.base_rating;
  
        if (info.own_vote !== undefined && info.own_vote !== null)
          elem.setAttribute('rpm-own-vote', info.own_vote.toString());


        (elem.querySelector('.rpm-pluses') as HTMLSpanElement).innerText = pluses.toString();
        (elem.querySelector('.rpm-rating') as HTMLSpanElement).innerText = rating.toString();
        (elem.querySelector('.rpm-minuses') as HTMLSpanElement).innerText = minuses.toString();

        elem.classList.remove('rpm-not-ready');
      }

      export async function updateUserRatingElemAsync(elem: HTMLDivElement, infoConsumer: (info: RpmJson.UserInfo) => void = null) {
        const uid = parseInt(elem.getAttribute('pikabu-user-id'));
        if (uid === null || uid === undefined || Number.isNaN(uid))
          return;
        
        let info = userCache.get(uid) ?? null;
        
        if (!info) {
          info = await Service.getUserInfo(uid);
          userCache.set(uid, info);
        }
        
        if (infoConsumer)
          infoConsumer(info);
        updateUserRatingElem(elem, info);
      }

      async function voteUser(uid: number, vote: number) {
        const info = userCache.get(uid);
        info.own_vote = vote;

        updateAll(uid, info);

        const response = await Service.voteUser(uid, vote as any);
      }

      function updateAll(uid: number, info: RpmJson.UserInfo) {
        getAllElementsOfUser(uid).forEach(e => updateUserRatingElem(e, info));
      }

      function getAllElementsOfUser(uid: number) {
        return document.querySelectorAll(`.rpm-user-rating-${uid}`) as NodeListOf<HTMLDivElement>;
      }

      export async function voteCallback(elem: HTMLDivElement, uid: number, btn: number) {
        if (!Service.isAuthorized()) {
          sendNotification('Ошибка', 'Чтобы проголосовать за автора, нужно зарегистрироваться в системе RPM. Вы можете сделать это в настройках.')
          return;
        }

        const ownVote = parseInt(elem.getAttribute('rpm-own-vote') ?? '0');
        let vote = ownVote;

        if (ownVote === btn)
          vote = 0;
        else
          vote += btn;

        info(vote)
        await voteUser(uid, vote);
        // TODO: check response
      }
    }
  }
}

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

  rpmEnabled: true,
  rpmMinStoryRating: 0,
  rpmComments: true,
  uuid: "",

  option(key: string) {
    config[key] = GM_config.get(key).valueOf();
  },
  update() {
    this.option("debug");
    this.option("minStoryRating")
    this.option("summary");
    this.option("filteringPageRegex")
    this.option("ratingBar");
    this.option("ratingBarComments");
    this.option("minRatesCountToShowRatingBar")

    function makeEval(args: string, str: string, defaultFunc: Function) {
      try {
        return new Function(args, "return " + str);
      } catch {
        return defaultFunc;
      }
    }

    config.minusesPattern = makeEval(
      "story",
      (GM_config.get("minusesPattern").valueOf() as string).replace(
        "%d",
        "story.minuses"
      ),
      (story: any) => story.minuses,
    );
    config.minusesCommentPattern = makeEval(
      "comment",
      (GM_config.get("minusesCommentPattern").valueOf() as string).replace(
        "%d",
        "comment.minuses"
      ),
      (comment: any) => comment.minuses,
    );
    config.ownCommentPattern = makeEval(
      "comment",
      GM_config.get("ownCommentPattern").valueOf() as string,
      (comment: any) => (comment.pluses == 0 && comment.minuses == 0) ? 0 : `${comment.pluses}/${comment.minuses}`,
    );

    this.option("unrollCommentariesAutomatically");
    this.option("videoDownloadButtons");
    this.option("showBlockAuthorForeverButton");
    this.option("allCommentsLoadedNotification");
    this.option("blockPaidAuthors");
    this.option("commentVideoDownloadButtons");

    this.option("socialLinks");
    this.option("uuid");

    this.option("rpmEnabled");
    this.option("rpmMinStoryRating");
    this.option("rpmComments");

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
    const div = document.createElement('div');

    const p1 = document.createElement('p');
    p1.textContent = "Return Pikabu minus";

    const links: HTMLAnchorElement[] = [];

    function addLink(text: string, url: string) {
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
      label:
        "Минимальное количество оценок у поста или комментария для отображения соотношения плюсов и минусов. " +
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
      label:
        "Отображение соотношения плюсов и минусов у постов. При отсутствии оценок у поста будет показано соотношение 1:1.",
    },
    showBlockAuthorForeverButton: {
      type: "checkbox",
      default: config.showBlockAuthorForeverButton,
      label:
        "Отображение кнопки, которая блокирует автора поста навсегда. То есть добавляет в игнор-лист. " + 
        "Вы должны быть авторизированы на сайте, иначе кнопка работать не будет.",
    },
    blockPaidAuthors: {
      type: "checkbox",
      default: config.blockPaidAuthors,
      label:
        "Удаляет из ленты посты от проплаченных авторов (которые с подпиской Пикабу+).",
    },


    videoDownloadButtons: {
      type: "checkbox",
      label:
        "Добавляет ко всем видео в постах ссылки на источники, если их возможно найти.",
      default: config.videoDownloadButtons,
    },
    socialLinks: {
      type: "checkbox",
      label:
        "Добавляет в начале заголовка поста значки Телеграма, ВК, Тиктока, если в посте есть соответствующие ссылки.",
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
      label: 
        "Раскрывать все комментарии автоматически. Не рекомендую использовать со слабым интернетом."
    },
    allCommentsLoadedNotification: {
      type: "checkbox",
      default: config.allCommentsLoadedNotification,
      label:
        "Показывать уведомление о загрузке всех комментариев под постом."
    },
    commentVideoDownloadButtons: {
      type: "checkbox",
      default: config.commentVideoDownloadButtons,
      label:
        "Добавляет ко всем видео в комментариях ссылки на источники, если их возможно найти."
    },

    // НАСТРОЙКИ RPM
    rpmEnabled: {
      section: ["Настройки RPM", "Дополнительные функции скрипта. Используются сервера RPM."],
      type: "checkbox",
      default: config.rpmEnabled,
      label:
        "Включить для постов."
    },
    rpmMinStoryRating: {
      type: "int",
      default: config.rpmMinStoryRating,
      label:
        "Минимальный рейтинг автора в системе RPM. Если рейтинг автора меньше его значения, то его посты будут удалены из ленты."
    },
    rpmComments: {
      type: "checkbox",
      default: config.rpmEnabled,
      label:
        "Включить для комментариев."
    },
    registerRpm: {
      type: "button",
      label:
        "Зарегистрироваться в системе RPM. После нажатия страница перезагрузится.",
      async click() {
        if (config.uuid === null || config.uuid === undefined || config.uuid === '') {
          config.uuid = await RPM.Service.register();
          GM_config.set('uuid', config.uuid);
          GM_config.save();
          sendNotification('Успешно', 'Вы успешно зарегистрировались. Или нет. Проверки успешности не существует.');
          
          await sleep(300);
          window.location.reload();
        } else {
          sendNotification('Вы уже зарегистрированы', 'Вы не можете зарегистрироватся ещё раз.');
        }
      }
    },

    // БОЛЕЕ СЛОЖНЫЕ НАСТРОЙКИ
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
        "Шаблон отображения минусов у постов (JS). Пример: `story.minuses * 5000`. story: {id, rating, pluses, minuses}. Внутри может выполняться любой код, поэтому используйте с осторожностью.\n" +
        "Шаблоны гарантированно работают только на Tampermonkey.",
    },
    minusesCommentPattern: {
      type: "text",
      default: "comment.minuses",
      label:
        "Шаблон отображения минусов у комментариев (JS). Пример: `comment.minuses * 5000`. comment: {id, rating, pluses, minuses}.",
    },
    ownCommentPattern: {
      type: "text",
      default:
        "comment.pluses == 0 && comment.minuses == 0 ? 0 : comment.pluses == comment.minuses ? `+${comment.pluses} / -${comment.minuses}` : comment.pluses == 0 ? `-${comment.minuses}` : comment.minuses == 0 ? `+${comment.pluses}` : `+${comment.pluses} / ${comment.rating} / -${comment.minuses}`",
      label:
        "Шаблон отображения рейтинга у ВАШИХ комментариев (JS). Пример: `comment.minuses * 5000`. comment: {id, rating, pluses, minuses}.",
    },

    debug: {
      type: "checkbox",
      label:
        "Включить дополнительные логи в консоли. Для разработки и отладки.",
      default: config.debug
    },
    uuid: {
      type: "hidden",
      // label:
      //   "Ваш уникальный UUID в системе рейтинга RPM. Позволяет вам оценивать профили других пользователей.",
      default: config.uuid
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

function info(...args: any): void {
  if (config.debug) {
    console.info(logPrefix, ...args);
  }
}

function warn(...args: any): void {
  if (config.debug) {
    console.warn(logPrefix, ...args);
  }
}

function error(...args: any): void {
  if (config.debug) {
    console.error(logPrefix, ...args);
  }
}

const waitConfig = new Promise<void>((resolve) => {
  let isInit = () => setTimeout(() => (isConfigInit ? resolve() : isInit()), 1);
  isInit();
});

const supportMenuCommands: boolean = GM.registerMenuCommand !== undefined;

GM.registerMenuCommand("Открыть настройки", () => {
  info("Открыты настройки.");
  GM_config.open();
});

function addCss(css: string) {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = css;
  // is added to the end of the body because it must override some of the original styles
  document.body.appendChild(styleSheet);
  info("Добавлен CSS");
}

class CommentData {
  public id: number;
  public rating: number;
  public pluses: number;
  public minuses: number;
  public videos: string[];

  public constructor(data: Pikabu.Comment) {
    this.id = data.id;
    this.rating = data.rating;
    this.pluses = data.pluses;
    this.minuses = data.minuses;
    this.videos = data.videos;
  }
}

// Variables
const cachedComments = new Map<number, CommentData>();
let oldInterface = null;
const deferredComments = new Map<number, CommentData>();
const cachedPostVideos = new Map<number, string[][]>();

const blockIconTemplate = (function () {
  const div = document.createElement("div");
  div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__save"><use xlink:href="#icon--ui__ban"></use></svg>`;
  return div.firstChild;
})();

// UI functions

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function sendNotification(title: string, description: string, timeout: number = 2000) {
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
    info("Автор с ID", authorId, "заблокирован");
  } catch {
    button.disabled = false;
    error("Не получилось заблокировать автора с ID", authorId, ", возможно отсутствует Интернет-соединение");
  }
}

function addBlockButton(story: HTMLDivElement) {
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

function processComment(comment: Pikabu.Comment | CommentData) {
  const commentElem = document.getElementById(
    `comment_${comment.id}`
  ) as HTMLDivElement;

  if (commentElem === null) {
    if (comment instanceof Pikabu.Comment) {
      cachedComments[comment.id] = new CommentData(comment);
      info('Закэшировал комментарий', comment.id)
    }
    return;
  }
  
  if (config.rpmComments)
    processCommentRpm(commentElem);

  const userElem = commentElem.querySelector(".comment__user");
  const ratingDown = commentElem.querySelector(".comment__rating-down");

  if (!userElem || !ratingDown) {
    // Defer comment
    info('У комментария', comment.id ,' нет юзера или кнопок рейтинга, кэширую его')
    // setTimeout(() => processComment(comment), 400);
    cachedComments[comment.id] = (comment instanceof Pikabu.Comment) ? new CommentData(comment) : comment;
    return;
  }

  if (
    userElem.hasAttribute("data-own") &&
    userElem.getAttribute("data-own") === "true"
  ) {
    const textRatingElem = commentElem.querySelector(
      ".comment__rating-count"
    ) as HTMLDivElement;
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
  if (
    config.ratingBarComments &&
    totalRates >= config.minRatesCountToShowRatingBar
  ) {
    let ratio: number = 0.5;

    if (totalRates > 0) ratio = comment.pluses / totalRates;

    addRatingBar(commentElem, ratio);
  }

  // Comment videos
  if (config.commentVideoDownloadButtons) {
    const videoElements = commentElem.querySelectorAll(':scope > .comment__body .comment-external-video');
    const videoCount = Math.min(videoElements.length, comment.videos.length)
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

  info('Обработал комметарий', comment.id)
}

async function processStoryComments(
  storyId: number,
  storyData: Pikabu.CommentsData,
  page: number
) {
  if (!isStoryPage || storyId != currentStoryId) {
    return;
  }

  for (const comment of storyData.comments) {
    processComment(comment);
  }

  if (storyData.hasMoreComments) {
    storyData = await Pikabu.DataService.fetchStory(storyId, page + 1);
    await processStoryComments(storyId, storyData, page + 1);
  } else if (config.allCommentsLoadedNotification) {
    sendNotification('Return Pikabu Minus', 'Все рейтинги комментариев загружены!');
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

interface LinkType {
  domains: string[];
  iconHtml: string;
  style?: string;
}

const linkTypes: LinkType[] = [
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
    iconHtml:`<svg class="icon" fill="#000000" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="50 50 217.4 197.4">
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

async function checkStoryLinks(
  story: HTMLDivElement
) {
  function addIcon(linkType: LinkType, element: HTMLAnchorElement) {
    const elem = element.cloneNode() as HTMLAnchorElement;
    elem.innerHTML = linkType.iconHtml.trim();

    if (linkType.style) {
      elem.setAttribute("style", linkType.style);
    }
    elem.classList.add('rpm-story-icon');

    // Add before the title
    const titleElem = story.querySelector('.story__title');
    titleElem.prepend(elem);
  }

  const linkElems = Array.from(story.querySelectorAll('.story__content a')) as HTMLAnchorElement[];
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

function removeStory(storyElem: HTMLDivElement, reason: string, keepUser: boolean = false) {
  const titleElem = storyElem.querySelector('.story__title a.story__title-link') as HTMLAnchorElement;
  if (titleElem === null)
    return;

  const title = titleElem.textContent;
  const url = titleElem.href;

  const placeholder = document.createElement('div');
  placeholder.classList.add('rpm-placeholder');
  
  const urlElem = document.createElement('a');
  urlElem.textContent = title;
  urlElem.href = url;

  const userInfo = storyElem.querySelector('.story__user-info');
  if (keepUser && userInfo) {
    const userInfoContainer = document.createElement('div');
    userInfoContainer.append(userInfo.cloneNode(true));
    userInfoContainer.classList.add('rpm-user-info-container')

    // Update RPM ratings
    for (const ratingElem of userInfoContainer.querySelectorAll('.rpm-user-rating')) {
      const uid = parseInt(ratingElem.getAttribute('pikabu-user-id'));
      ratingElem.replaceWith(RPM.Nodes.createUserRatingNode(uid));
    }

    placeholder.append(urlElem, ` скрыт: ${reason}.`, userInfoContainer);
  } else {
    placeholder.append(urlElem, ` скрыт: ${reason}.`);
  }

  storyElem.parentElement.insertBefore(placeholder, storyElem);

  const collapseButton = document.createElement('div');
  collapseButton.classList.add("collapse-button", "collapse-button_active");
  collapseButton.append(document.createElement('div'), document.createElement('div'));
  collapseButton.addEventListener('click', () => {
    if (collapseButton.classList.contains('collapse-button_active'))
      collapseButton.classList.remove('collapse-button_active');
    else
      collapseButton.classList.add('collapse-button_active');
  });

  placeholder.prepend(collapseButton);
}

function processOldStory(
  story: HTMLDivElement,
  storyData: Pikabu.CommentsData
) {
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
    else summary.classList.add("story__rating-count", "rpm-story-summary");
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
  // Block author button
  if (config.showBlockAuthorForeverButton) {
    addBlockButton(story);
  }

  // Links
  if (config.socialLinks) {
    checkStoryLinks(story);
  }

  // Block paid stories
  if (
    enableFilters &&
    config.blockPaidAuthors &&
    story.querySelector(".user__label[data-type=\"pikabu-plus\"]") !== null
  ) {
    removeStory(story, "подписка Пикабу+", true);
    info("Удалил пост", story, "как проплаченный:", `${config.blockPaidAuthors} = true`)
    return;
  }

  const storyId = parseInt(story.getAttribute("data-story-id"));

  // get story data
  const storyData = await Pikabu.DataService.fetchStory(storyId, 1);

  if (storyData === null || storyData === undefined) {
    warn("Не удалось получить пост #", storyId)
    return;
  }
  // delete the story if its ratings < the min rating
  if (
    enableFilters &&
    storyData.story.rating < config.minStoryRating
  ) {
    removeStory(story, `рейтинг поста (${storyData.story.rating})`);
    info("Удалил пост", story, "по фильтру рейтинга:", `storyData.story.rating < config.minStoryRating = ${storyData.story.rating} < ${config.minStoryRating} = true`)
    return;
  }

  // videos
  if (config.videoDownloadButtons)
    processPostVideos(story, storyData);
  
  try {
    processOldStory(story, storyData);
  } finally {
    // Execute it if the previous call fails
    if (config.rpmEnabled)
      processStoryRpm(story);
  }

}

async function processStoryRpm(story: HTMLDivElement) {
  const uid = parseInt(story.getAttribute('data-author-id'));

  const userInfoRowElem = story.querySelector('.story__community_after-author-panel, .story__user-info');
  const footerElem = story.querySelector('.story__footer-tools .story__comments-link.story__to-comments');

  function ratingCallback(userInfo: RpmJson.UserInfo) {
    if (!enableFilters) return;
    const rating = userInfo.base_rating + userInfo.pluses - userInfo.minuses + (userInfo.own_vote ?? 0);

    if (rating < config.rpmMinStoryRating) {
      removeStory(story, `RPM-рейтинг (${rating})`, true);
    }
  }

  const elem = RPM.Nodes.createUserRatingNode(uid, ratingCallback);

  if (userInfoRowElem)
    userInfoRowElem.prepend(elem);
  else
    footerElem.parentElement.insertBefore(elem, footerElem);
}

function getCommentAuthorId(comment: HTMLDivElement) {
  if (comment.hasAttribute('data-author-id')) {
    return parseInt(comment.getAttribute('data-author-id'));
  }
  if (comment.hasAttribute('data-meta')) {
    return parseInt(comment.getAttribute('data-meta').match(/(?:^|;)aid=(\d+)(?:;|$)/)[1]);
  }
  return null;
}

function processCommentRpm(comment: HTMLDivElement) {
  const uid = getCommentAuthorId(comment);
  if (!uid) return;

  const commentHeader = comment.querySelector('.comment__header');
  info(comment, uid);
  const elem = RPM.Nodes.createUserRatingNode(uid);

  commentHeader.insertBefore(elem, commentHeader.querySelector('.comment__right'));
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

function processPostVideos(story: HTMLDivElement, storyData: Pikabu.CommentsData) {
  function getPostPlayers(): HTMLElement[] {
    return Array.from(story.querySelectorAll('.story-block_type_video'));
  }

  function createUrl(text: string, url: string) {
    const urlElem = document.createElement('a');
    urlElem.target = '_blank';
  
    urlElem.textContent = text;
    urlElem.href = url;

    return urlElem;
  }

  function addUrlToPlayer(videoBlock: HTMLElement, urls: string[]) {
    const player = videoBlock.querySelector('.player') as HTMLDivElement;

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
    } else {
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

function addVideoDownloadButtons(postId: number, url: string) {
  const videoControls: HTMLDivElement[] = Array.from(document.querySelectorAll(`.story[data-story-id="${postId}"] .player__controls`));

  function addButton(link: string, videoControls: HTMLDivElement) {
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

function unrollComments(button: HTMLButtonElement) {  
  info('Раскручиваю ' + button.querySelector('span').textContent);
  button.click();

  setTimeout(() => {
    if (document.body.contains(button)) {
      unrollComments(button);
    }
  }, 500);
}

function mutationsListener(
  mutationList: MutationRecord[],
  observer: MutationObserver
) {
  for (const mutation of mutationList) {
    if (mutation.type === 'childList') {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.hasAttribute('rpm-observer-ignore')) continue;
  
        if (node.matches(".comment__header")) {
          const commentElem = node.closest(".comment") as HTMLDivElement;
          info('Поймал голову комментария!', commentElem)
          processCached(commentElem);
        } else if (node.matches("article.story")) {
          const storyElem = node as HTMLDivElement;
          info('Поймал пост!', storyElem)
          processStory(storyElem, false);
        } else if (node.matches(".comment__more") && config.unrollCommentariesAutomatically) {
          const button = node as HTMLButtonElement;
          info('Поймал кнопку!', button)
          unrollComments(button);
        }
      }
    }
  }
}

var observer: MutationObserver = null;

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

function init() {
  window.addEventListener("load", onLoad);
  main()
}

async function main() {
  await waitConfig;
  config.update(); // Just in case.

  if (config.uuid !== '') {
    delete GM_config.fields['registerRpm'];
  }

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
.rpm-user-rating {
  font-size: 1.05em;
  padding: 0.3em 0.6em;
  border-radius: 1rem;
  display: inline-block;
  background-color: var(--color-black-alpha-005);
  user-select: none;
  white-space: nowrap;
  line-height: 1em;
}
.story__main .rpm-user-rating,
.rpm-placeholder .rpm-user-rating {
  margin-right: 10px;
}
.comment__header .rpm-user-rating {
  margin-left:auto;
  right: 0;
}
.rpm-user-rating + .comment__right {
  margin-left: unset;
}
.rpm-user-rating span {
  display: inline-block;
  min-width: 1.5ch;
  text-align: center;
}
.rpm-user-rating .rpm-rating {
  margin: 0 1ch;
}
.rpm-user-rating .rpm-pluses {
  color: var(--color-primary-700);
  cursor: pointer;
}
.rpm-user-rating .rpm-minuses {
  color: var(--color-danger-900);
  cursor: pointer;
}
.rpm-user-rating[rpm-own-vote="1"] {
  background-color: var(--color-primary-200)
}
.rpm-user-rating[rpm-own-vote="-1"] {
  background-color: var(--color-danger-200)
}
.rpm-placeholder {
  background-color: var(--color-bright-800);
  border: 1px solid var(--color-black-430);
  border-radius: 15px;
  width: max-content;
  height: max-content;
  text-align: center;
  margin: 10px auto 0;
  padding: 5px 20px;
  position: relative;
  max-width: 95%;
}
.rpm-placeholder .rpm-user-info-container {
  width: max-content;
  padding: 0.5em;
  border-radius: 10px;
  margin: 0 auto;
}
.rpm-placeholder .collapse-button {
  position: absolute;
  top: 0;
  left: -70px;
  translate: 0 -70%;
}
.mv .rpm-placeholder {
  font-size: 0.825em;
}
.mv .rpm-placeholder .collapse-button {
  display: inline flow-root list-item;
  position: initial;
  margin: 0 auto;
  translate: 0 0;
  transform: scale(0.75);
}
.rpm-placeholder:has(.collapse-button_active) + article {
  display: none;
}

.rpm-loading {
  display: none;
  min-width: 4px;
  min-height: 4px;
  
  border: 7px solid var(--color-primary-400);
  border-top: 7px solid var(--color-primary-700);
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}
.rpm-not-ready * {
  display: none !important;
}
.rpm-not-ready .rpm-loading {
  display: block !important;
}`);
}

async function onLoad() {
  observer = new MutationObserver(mutationsListener);
  observer.observe(document.querySelector(".app__content, .main__inner"), {
    childList: true,
    subtree: true,
  });

  processStories(document.querySelectorAll("article.story"));

  if (!supportMenuCommands)
    addSettingsOpenButton();
}

init();