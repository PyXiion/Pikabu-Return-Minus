import { appState } from "../config/state";
import { checkStoryLinks } from "./links";
import { getRealRating, replaceRating } from "./rating";
import { addBlockButton, addRatingBar, updateRatingBar } from "./story-ui";
import { processPostVideos } from "./videos";
import { error, info } from "../utils/log";
import * as RPM from "../rpm";

function removeStory(
  storyElem: HTMLDivElement,
  reason: string,
  keepUser: boolean = false
) {
  const titleElem = storyElem.querySelector(
    ".story__title a.story__title-link"
  ) as HTMLAnchorElement;
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

    // Update RPM ratings
    for (const ratingElem of userInfoContainer.querySelectorAll(
      ".rpm-user-rating"
    )) {
      const uid = parseInt(ratingElem.getAttribute("pikabu-user-id"));
      ratingElem.replaceWith(RPM.Nodes.createUserRatingNode(uid, url));
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

const trackedLinkPattern = /pikabu.ru.+\?[ut]=(.+?)&[ut]=.+/i;

function removeLinkTracker(link: HTMLAnchorElement) {
  if (trackedLinkPattern.test(link.href)) {
    const realUrl = trackedLinkPattern.exec(link.href)[1];
    link.href = decodeURIComponent(realUrl);
  }
}

export async function processStory(story: HTMLDivElement) {
  // The observer and the load handler can both see the same story
  if (story.hasAttribute("rpm-story-processed")) return;
  story.setAttribute("rpm-story-processed", "");

  // Block author button
  if (GM_config.get("showBlockAuthorForeverButton")) {
    addBlockButton(story);
  }

  // Links
  if (GM_config.get("socialLinks")) {
    checkStoryLinks(story);
  }

  // Remove pikabu trackers
  if (GM_config.get("noLinkTracking")) {
    const links = story.querySelectorAll("a");
    links.forEach(removeLinkTracker);
  }

  // Block paid stories
  if (
    appState.enableFilters &&
    GM_config.get("blockPaidAuthors") &&
    story.querySelector('.user__label[data-type="pikabu-plus"]') !== null
  ) {
    removeStory(story, "подписка Пикабу+", true);
    info("Удалил пост", story, "как проплаченный");


    // RPM.Analytics.sendEvent('blockPaidAuthor');
  }

  // RPM
  if (GM_config.get("rpmEnabled")) {
    try {
      processStoryRpm(story).catch(error);
    } catch (e) {
      error(e);
    }
  }

  const rating = parseInt(story.getAttribute('data-rating'));

  // delete the story if its ratings < the min rating
  if (
    appState.enableFilters &&
    rating < (GM_config.get("minStoryRating") as number)
  ) {
    removeStory(story, `рейтинг поста (${rating})`);
    info("Удалил пост", story, "по фильтру рейтинга");
  }

  // videos
  if (GM_config.get("videoDownloadButtons"))
    processPostVideos(story);

  const ratingBlock = story.querySelector('.story__rating-block');
  // Ads and other non-standard articles have no rating block
  if (!ratingBlock) return;
  const vid = story.getAttribute('data-vid');
  const authorId = parseInt(story.getAttribute('data-author-id'));
  const pluses = getRealRating(parseInt(ratingBlock.getAttribute('data-pluses')), vid, authorId);
  const minuses = getRealRating(parseInt(ratingBlock.getAttribute('data-minuses')), vid, authorId);
  const vote = parseInt(ratingBlock.getAttribute('data-vote') || '0');

  let onVoteCallback = null;

  if (GM_config.get("ratingBar") && (pluses + minuses !== 0) && (pluses + minuses) >= (GM_config.get('minRatesCountToShowRatingBar') as number)) {
    const bar = addRatingBar(story, (pluses) / (pluses + minuses))

    onVoteCallback = (x, y) => {
      updateRatingBar(bar, x, y);
    }
  }


  replaceRating(ratingBlock.querySelector('.story__rating-count'), vote, pluses, minuses, false, onVoteCallback);
}

async function processStoryRpm(story: HTMLDivElement) {
  const storyId = parseInt(story.getAttribute('data-story-id'))
  const uid = parseInt(story.getAttribute("data-author-id"));

  const userInfoRowElem = story.querySelector(
    ".story__community_after-author-panel, .story__user-info"
  );
  const footerElem = story.querySelector(
    ".story__footer-tools .story__comments-link.story__to-comments"
  );

  function ratingCallback(userInfo: RpmJson.UserInfo) {
    if (!appState.enableFilters) return;
    const rating =
      userInfo.base_rating +
      userInfo.pluses -
      userInfo.minuses +
      (userInfo.own_vote ?? 0);
    const ownVote = userInfo.own_vote ?? 0;

    if (ownVote === -1) {
      removeStory(
        story,
        userInfo.own_reason_text ?? `ваш минус пользователю в RPM`,
        true
      );
    } else if (
      rating < (GM_config.get("rpmMinStoryRating") as number) &&
      ownVote != 1
    ) {
      removeStory(story, `RPM-рейтинг (${rating})`, true);
    }
  }

  const elem = RPM.Nodes.createUserRatingNode(uid, `https://pikabu.ru/story/_${storyId}`, ratingCallback);

  if (userInfoRowElem) userInfoRowElem.prepend(elem);
  else if (footerElem?.parentElement) footerElem.parentElement.insertBefore(elem, footerElem);
  else return; // no known place for the badge in this layout

  // Vote reason
  if (GM_config.get("rpmStoryVoteReason")) {
    let info: RpmJson.UserInfo = null;
    try {
      info = await RPM.Service.getUserInfo(uid);
    } catch (e) {
      error(e);
    }
    if (info?.own_reason_text) {
      const storyMain = story.querySelector(".story__main");

      storyMain.insertBefore(
        RPM.Nodes.createUserVoteReasonContainer(info.own_reason_text),
        storyMain.querySelector(".story__content-wrapper")
      );
    }
  }
}

export async function processStories(stories: Iterable<HTMLDivElement>) {
  for (const story of stories) {
    processStory(story);
  }
}
