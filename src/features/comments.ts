import { getRealRating, replaceRating } from "./rating";
import { addRatingBar, updateRatingBar } from "./story-ui";
import * as RPM from "../rpm";

function getCommentAuthorId(comment: HTMLDivElement) {
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

function getCommentMeta(comment: HTMLDivElement, key: string) {
  if (comment.hasAttribute("data-meta")) {
    const matches = comment.getAttribute("data-meta").match(`(?:^|;)${key}=(.+?)(?:;|$)`);
    if (matches !== null && matches.length > 1)
      return matches[1];
  }
  return null;
}

export async function processComment(commentElem: HTMLDivElement) {
  const commentRatingBlock = commentElem.querySelector('.comment__rating') as HTMLDivElement;
  if (commentRatingBlock.childElementCount === 1)
    return;
  const vid = commentElem.getAttribute('data-id');
  const authorId = parseInt(commentElem.getAttribute('data-author-id'));
  const pluses = getRealRating(parseInt(commentRatingBlock.getAttribute('data-pluses')), vid, authorId);
  const minuses = getRealRating(parseInt(commentRatingBlock.getAttribute('data-minuses')), vid, authorId);
  const vote = parseInt(getCommentMeta(commentElem, 'v') || '0')

  let onVoteCallback = null;

  if (GM_config.get('ratingBarComments') && (pluses + minuses !== 0) && (pluses + minuses) >= (GM_config.get('minRatesCountToShowRatingBar') as number)) {
    const bar = addRatingBar(commentElem, (pluses) / (pluses + minuses));

    onVoteCallback = (pluses, minuses) => {
      updateRatingBar(bar, pluses, minuses);
    };

  }

  replaceRating(commentElem.querySelector('.comment__rating-count'), vote, pluses, minuses, true, onVoteCallback);

  if (GM_config.get('commentVideoDownloadButtons')) {
    processCommentVideos(commentElem);
  }
}

export function processCommentRpm(comment: HTMLDivElement) {
  const uid = getCommentAuthorId(comment);
  if (!uid) return;

  let url = comment.getAttribute('data-copy-url');
  if (!url) url = (comment.querySelector(':scope > .comment__body > .comment__header a.comment__tool[data-role="link"]') as HTMLAnchorElement).href;

  const commentHeader = comment.querySelector(".comment__header");
  const elem = RPM.Nodes.createUserRatingNode(uid, url);

  commentHeader.insertBefore(
    elem,
    commentHeader.querySelector(".comment__right")
  );
}

function processCommentVideos(commentElem: HTMLDivElement) {
  const videoElements = commentElem.querySelectorAll(
    ":scope > .comment__body .comment-external-video"
  );
  for (const videoElem of videoElements) {
    const content = videoElem.querySelector('.comment-external-video__content');
    if (!content) continue;
    const url = content.getAttribute('data-external-link');
    if (!url) continue;

    const linkElem = document.createElement("a");
    linkElem.classList.add("rpm-download-video-button");
    linkElem.href = url;
    linkElem.text = "Источник";
    linkElem.target = "_blank";

    videoElem.parentNode.insertBefore(linkElem, videoElem.nextSibling);
  }
}
