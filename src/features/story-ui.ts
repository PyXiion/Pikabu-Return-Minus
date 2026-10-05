import { error, info, warn } from "../utils/log";

const blockIconTemplate = (function () {
  const div = document.createElement("div");
  div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--ui__save"><use xlink:href="#icon--ui__ban"></use></svg>`;
  return div.firstChild;
})();

// UI functions

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
    error(
      "Не получилось заблокировать автора с ID",
      authorId,
      ", возможно отсутствует Интернет-соединение"
    );
  }
}

export function addBlockButton(story: HTMLDivElement) {
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

  saveButton.parentElement?.insertBefore(button, saveButton);
}

function ratioToPercent(ratio: number) {
  const safe = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0.5;
  return `${(safe * 100).toFixed(1)}%`;
}

export function addRatingBar(story: HTMLDivElement, ratio: number) {
  const block = story.querySelector(
    ".story__rating-block, .comment__body, .story__emotions"
  );

  // No supported layout (e.g. mobile): callers must tolerate a missing bar
  if (block === null) return null;

  const bar = document.createElement("div");
  const inner = document.createElement("div");

  bar.append(inner);

  bar.classList.add("rpm-rating-bar");
  inner.classList.add("rpm-rating-bar-inner");

  inner.style.height = ratioToPercent(ratio);

  block.prepend(bar);
  return inner;
}

export function updateRatingBar(innerRatingBarElem: HTMLDivElement | null | undefined, pluses: number, minuses: number) {
  if (!innerRatingBarElem) return;
  const total = pluses + minuses;
  innerRatingBarElem.style.height = ratioToPercent(total > 0 ? pluses / total : 0.5);
}
