import { HttpRequest } from "../net/http";
import { sleep } from "../utils/dom";
import { error } from "../utils/log";
import { sendNotification, notifyError } from "../utils/notification";

const DOMAIN = 'https://rpm.pyxiion.ru/';
// const DOMAIN = "http://localhost:8000/";

const USER_REQUEST_QUEUE_PERIOD = 300;
let PERIOD_MULTIPLIER = 1;
const USER_REQUEST_QUEUE_AT_ONCE = 25;

export function isAuthorized() {
  return GM_config.get("uuid") !== "";
}

export async function register() {
  const response = (await post(
    DOMAIN + "register",
    {}
  )) as RpmJson.RegisterResponse;
  return response.secret;
}

export async function getFeedbacks() {
  const response = (await get(
    DOMAIN + "meta/feedback"
  )) as RpmJson.MetaFeedbackResponse;
  return response;
}

interface UserInfoRequest {
  resolve: (info: RpmJson.UserInfo) => void;
  reject: (e: any) => void;
}

const userInfoRequestQueue: Map<number, UserInfoRequest[]> = new Map();
const userInfoRetries: Map<number, number> = new Map();
const USER_INFO_MAX_RETRIES = 3;
const MAX_PERIOD_MULTIPLIER = 16;
let isQueueRunning = false;
// The server was unreachable recently: fail fast instead of retrying every request
let unavailableUntil = 0;
const UNAVAILABLE_COOLDOWN_MS = 60_000;

export function getUserInfo(id: number): Promise<RpmJson.UserInfo> {
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

async function getBunchOfUserRatings(ids: number[]) {
  const body: RpmJson.InfoBunchRequest = {
    ids,
  };
  const uuid = GM_config.get("uuid") as string;
  if (uuid) body.user_uuid = uuid;

  // Background request: a failure must not spam the user with toasts
  const response = (await post(
    DOMAIN + "v2/users/ratings",
    body,
    { silent: true }
  )) as RpmJson.InfoBunchResponse;

  const users = response?.users ?? {};
  for (const id in users) {
    postprocessUserInfo(users[id]);
  }

  return users;
}

async function workQueue(sleepTime: number = 0) {
  if (userInfoRequestQueue.size === 0 || isQueueRunning) return;
  isQueueRunning = true;

  await sleep(sleepTime);

  // Извлекаем до N уникальных запросов из очереди
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
      // Пользователь без оценок: сервер может не вернуть запись
      const info = usersInfo[id] ?? { pluses: 0, minuses: 0, base_rating: 0 };
      userRequests?.forEach((req) => req.resolve(info));
    });
    PERIOD_MULTIPLIER = 1;
    unavailableUntil = 0;
  } catch (e) {
    error("Error processing user info requests:", e);
    PERIOD_MULTIPLIER = Math.min(PERIOD_MULTIPLIER * 2, MAX_PERIOD_MULTIPLIER);

    // Give up on ids that keep failing so their callers don't wait forever
    ids.forEach((id) => {
      const retries = (userInfoRetries.get(id) ?? 0) + 1;
      if (retries >= USER_INFO_MAX_RETRIES) {
        // Stop hammering a server that is down
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

  // Повторный запуск, если есть еще запросы
  if (userInfoRequestQueue.size > 0) {
    setTimeout(() => workQueue(), USER_REQUEST_QUEUE_PERIOD * PERIOD_MULTIPLIER);
  }
}

function postprocessUserInfo(info: RpmJson.UserInfo) {
  if (info.own_vote) {
    // Removes own vote from other votes
    info.pluses -= info.own_vote === 1 ? 1 : 0;
    info.minuses -= info.own_vote === -1 ? 1 : 0;
  }
}

export function voteUser(
  id: number,
  vote: number,
  reasonId: number = null,
  reasonText: string = null,
  url: string = null
) {
  if (!isAuthorized()) return null;
  const data = {
    user_uuid: GM_config.get("uuid"),
    vote,
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

function isOk(status: number) {
  return status >= 200 && status < 300;
}

function handleBody(body: any) {
  if (body && typeof body === "object") {
    if ('message' in body) {
      sendNotification("Сообщение", body.message);
    }
    if (body.result === 'error') {
      throw Error(body.message ?? 'Unknown error');
    }
  }
}

async function send(request: HttpRequest, silent: boolean): Promise<Object> {
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

export async function post(
  url: string,
  json: Object,
  options: { silent?: boolean } = {}
): Promise<Object> {
  const request = new HttpRequest(url, "POST", "json");
  request.addHeader("Content-Type", "application/json");
  request.setBody(json);
  return send(request, !!options.silent);
}

export async function get(url: string, options: { silent?: boolean } = {}): Promise<Object> {
  return send(new HttpRequest(url, "GET", "json"), !!options.silent);
}

let reasonsCache: RpmJson.Reason[] = null;
export async function getReasons(): Promise<RpmJson.Reason[]> {
  if (reasonsCache !== null) return reasonsCache;

  const body = (await get(DOMAIN + "meta/vote_reasons")) as any;
  reasonsCache = Array.isArray(body?.reasons) ? body.reasons : [];

  return reasonsCache;
}

export async function getUserVotes(uid: number): Promise<RpmJson.VotesInfo[]> {
  const body = (await post(DOMAIN + `v2/user/${uid}/votes`, {
    user_uuid: GM_config.get("uuid")
  })) as any;
  return Array.isArray(body?.reasons) ? body.reasons : [];
}
