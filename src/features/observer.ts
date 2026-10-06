import { handleComment } from "./comments";
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

        // Pikabu may re-render only the inside of an existing comment
        const owner = node.closest<HTMLDivElement>(".comment:not(.comment_deleted)");
        const comments = node.querySelectorAll<HTMLDivElement>(".comment:not(.comment_deleted)");

        if (owner) handleComment(owner);
        for (const commentElem of Array.from(comments)) handleComment(commentElem);

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

