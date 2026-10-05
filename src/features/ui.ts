import { waitForElement } from "../utils/dom";
import { error } from "../utils/log";

export function addSettingsOpenButton() {
  let block =
    // mobile version
    document.querySelector(".footer__links .accordion") ??
    // else PC version
    document.querySelector(".sidebar .sidebar__inner");

  if (block === null) {
    error("Не удалось найти место для создания кнопки открытия настроек.");
    return;
  }

  const button = document.createElement("button");
  button.innerText = "Открыть настройки Return Pikabu minus";
  button.classList.add("rpm-open-settings-button");
  button.addEventListener("click", () => {
    button.disabled = true;

    GM_config.open();

    button.disabled = false;
  });

  block.appendChild(button);
}

export async function processTabs() {
  const tabConfig = {
    hot: "hotTab",
    best: "bestTab",
    new: "newTab",
    my_lent: "subsTab",
    communities: "communitiesTab",
    companies: "blogsTab",
    experts: "expertsTab",
  };

  try {
    await waitForElement(".header-menu__item, .pkb-tab-list");
  } catch {
    return; // no tab bar on this page
  }

  Object.entries(tabConfig).forEach(([key, field]) => {
    const selector = `.header-menu__item[data-feed-key="${key}"], .pkb-tab[data-feed-key="${key}"]`;

    if (!GM_config.get(field)) {
      const element = document.querySelector(selector);
      if (element) {
        element.remove();
      }
    }
  });
}
