import { processComment, processCommentRpm } from "./comments";
import { handleMiniProfile } from "./mini-profile";
import { processStory } from "./stories";
import { commentMoreBtn } from "../main";
import { waitForElement } from "../utils/dom";
import { info } from "../utils/log";

export function mutationsListener(
  mutationList: MutationRecord[],
  observer: MutationObserver
) {
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.hasAttribute("rpm-observer-ignore")) continue;

        const comments = node.matches(".comment")
          ? [node]
          : Array.from(node.querySelectorAll(".comment:not(.comment_deleted)"));

        for (const commentElem of comments as HTMLDivElement[]) {
          if (commentElem.dataset.processed) continue;

          info("Поймал комментарий!", commentElem);
          processComment(commentElem);

          if (GM_config.get("rpmComments")) {
            processCommentRpm(commentElem);
          }
          commentElem.dataset.processed = "true";
        }

        if (node.matches("article.story")) {
          const storyElem = node as HTMLDivElement;
          info("Поймал пост!", storyElem);
          processStory(storyElem);
        } else if (node.matches(".comment__more:not(.rpm-unroll-all)")) {
          commentMoreBtn();
        } else if (node.matches(".overlay")) {
          info("Поймал .overlay!");

          waitForElement(".theme-picker__popup, .mini-profile", 500, node).then(
            (e: HTMLDivElement) => {
              if (e.matches(".mini-profile")) {
                info("Поймал мини-профиль!", e);
                handleMiniProfile(e as any);
              }
            },
            () => { }
          );
        } else if (node.matches(".mini-profile")) {
          handleMiniProfile(node as any);
        }
      }
    }
  }
}

