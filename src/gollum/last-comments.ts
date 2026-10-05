import { HttpRequest } from "../net/http";
import { createLoadButton, createStatusMessage } from "./status";
import { error } from "../utils/log";
import * as RPM from "../rpm";

const CHUNK_SIZE = 5;
const COMMENT_UP_DEPTH = 2;

const parser = new DOMParser();

interface GollumCommentInfo {
  id: number;
  postId: number;
  postTitle: string;
  rating: string;
  link: string;
}

async function loadCommentFromPikabu(
  info: GollumCommentInfo,
  parent: boolean = false,
  disableMiniProfile = false
) {
  const request = new HttpRequest(info.link, "GET", "arraybuffer", {
    anonymous: false,
  });
  request.addHeader(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
  );
  const response = await request.executeAsync();

  // Ебал я этот ваш Пикабу, нахуя он использует CP1251
  const buffer = response.response as ArrayBuffer;
  const dec = new TextDecoder("windows-1251");
  const body = dec.decode(new Uint8Array(buffer));
  const htmlDoc = parser.parseFromString(body, "text/html");

  const wantedElem = htmlDoc.querySelector(
    parent === false ? `#comment_${info.id}` : ".comments"
  );
  const clone = wantedElem.cloneNode(true) as HTMLDivElement;

  return postprocessPikabuComment(clone, info.id, disableMiniProfile);
}

function postprocessPikabuComment(
  element: HTMLDivElement,
  commentId: number,
  disableMiniProfile = false
) {
  element.classList.add("rpm-comment-no-js");

  element.querySelectorAll(".comment").forEach((x) => {
    x.classList.add(x.getAttribute("id"));
    x.removeAttribute("id");

    // Fix comment toggling
    const children = x.querySelector(
      ":scope > .comment__children"
    ) as HTMLDivElement;
    const toggle = x.querySelector(
      ":scope > .comment-toggle-children"
    ) as HTMLDivElement;

    if (children && toggle) {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        children.toggleAttribute("hidden");
        toggle.classList.toggle("comment-toggle-children_collapse");
      });
    }

    // Fix vue video player
    x.querySelectorAll(':scope > .comment__body .vue-video-player')
    .forEach((e: HTMLDivElement) => {
      const source = e.getAttribute('data-source');
      if (source === '') return;
      const img = document.createElement('img');
      img.src = source;
      img.style.width = '100%';
      e.parentElement.replaceWith(img);
    });
  });

  const commentElem = element.querySelector(
    `.comment_${commentId}`
  ) as HTMLDivElement;
  commentElem.classList.add("rpm-highlight-comment");

  const children = commentElem.querySelector(
    ":scope > .comment__children"
  ) as HTMLDivElement;
  const toggle = commentElem.querySelector(
    ":scope > .comment-toggle-children"
  ) as HTMLDivElement;
  if (children && toggle) {
    children.toggleAttribute("hidden");
    toggle.classList.toggle("comment-toggle-children_collapse");
  }

  // Depth control
  // commentElem.querySelectorAll(':scope' + ' > .comment__children > .comment'.repeat(COMMENT_DOWN_DEPTH + 1) + ', :scope' + ' > .comment__children'.repeat(COMMENT_DOWN_DEPTH) + '> .comment-toggle-children').forEach(x => {
  //   x.remove();
  // });

  let parent = commentElem as HTMLElement;
  for (let i = 0; i < COMMENT_UP_DEPTH; ++i) {
    const container = parent.parentElement as HTMLElement;

    if (container !== null && container.matches(".comment__children")) {
      for (const child of container.childNodes) {
        if (
          child.nodeType === Node.ELEMENT_NODE &&
          !parent.isSameNode(child)
        ) {
          child.remove();
          // (child as HTMLElement).style.opacity = '50%';
        }
      }

      const parentComment = container.parentElement as HTMLElement;
      parent = parentComment;
    }
  }

  if (disableMiniProfile) {
    element
      .querySelectorAll(".comment__user")
      .forEach((x: HTMLDivElement) => {
        x.removeAttribute("data-profile");
      });
  }

  element.querySelectorAll("img").forEach((x: HTMLImageElement) => {
    if (x.hasAttribute("data-src")) {
      x.src = x.getAttribute("data-src");
      x.classList.add("image-loaded");
    }
  });

  return parent;
}

function createCommentContainer(
  info: GollumCommentInfo,
  autoload: boolean,
  disableMiniProfile
) {
  const container = document.createElement("div");
  container.classList.add("rpm-comment-container");

  const title = document.createElement("a");
  title.href = info.link;
  title.target = "_blank";
  title.textContent = `${info.rating} | ${info.postTitle}`;

  let current: Element;
  const loadFull = async () => {
    const icon = RPM.Nodes.createLoadingIcon();
    current.replaceWith(icon);
    current = icon;

    try {
      const pikabuComment = await loadCommentFromPikabu(
        info,
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

  const preview = createCommentPreview(info, loadFull);
  current = preview;

  container.append(title, preview);

  if (autoload) {
    loadFull();
  }

  return container;
}

function createCommentPreview(
  info: GollumCommentInfo,
  loadCallback: () => any
): HTMLDivElement {
  const container = document.createElement("div");
  container.classList.add("rpm-comment-preview");

  const buttonToLoad = createLoadButton("Загрузить", loadCallback);

  container.append(buttonToLoad);

  return container;
}

async function loadCommentsFromGollum(
  userName: string
): Promise<GollumCommentInfo[]> {
  userName = userName.replace(/\./g, "_");

  const request = new HttpRequest(
    `https://gollum.space/user/${userName}-last`,
    "GET",
    "document"
  );
  const response = await request.executeAsync();
  const htmlDoc = response.response as Document;
  if (!htmlDoc) throw new Error("Gollum returned no document");

  const comments = Array.from(
    htmlDoc.querySelectorAll(".comment-block")
  ) as HTMLDivElement[];

  const result: GollumCommentInfo[] = [];
  for (const elem of comments) {
    const anchor = elem.querySelector(".comment-link") as HTMLAnchorElement;
    const [rating = "", postTitle = ""] = (elem.getAttribute("title") ?? "")
      .split("|")
      .map((x) => x.trim());
    if (!anchor) continue; // markup changed or an unexpected block

    result.push({
      id: parseInt(anchor.textContent),
      postId: parseInt(elem.getAttribute("post")),
      postTitle,
      rating,
      link: anchor.href.replace("pikabu.ru", "gollum.space"),
    });
  }
  return result;
}

export function createLastCommentsSection(
  userName: string,
  autoloadGollum = false,
  autoloadCount = 0,
  disableMiniProfile = false
) {
  const main = document.createElement("div");
  main.classList.add("rpm-last-comments");

  const title = document.createElement("h4");
  title.textContent = "Последние комментарии";

  const containerOfComments = document.createElement("div");
  containerOfComments.classList.add("rpm-last-comments-container");

  let comments: GollumCommentInfo[] | null = null;
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
    const loadingIcon = RPM.Nodes.createLoadingIcon();
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
