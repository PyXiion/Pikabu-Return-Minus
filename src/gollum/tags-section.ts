import { getUserId } from "./api";
import { createLoadButton, createStatusMessage } from "./status";
import { error } from "../utils/log";
import * as RPM from "../rpm";

function createTag(name: string) {
  const elem = document.createElement("span");
  elem.classList.add("rpm-tags-tag");
  elem.textContent = name;
  return elem;
}

export function createTagsSection(
  userName: string,
  tagsGetter: (userId: number) => Promise<string[]>,
  autoload = false
) {
  const elem = document.createElement("div");
  elem.classList.add("rpm-tags-list");

  const loadTags = async () => {
    elem.replaceChildren(RPM.Nodes.createLoadingIcon());
    try {
      const userId = await getUserId(userName);
      const tags = await tagsGetter(userId);

      elem.replaceChildren(
        ...(tags.length > 0
          ? tags.map(createTag)
          : [createStatusMessage("Теги не найдены.")])
      );
    } catch (e) {
      error(e);
      elem.replaceChildren(
        createStatusMessage("Не удалось получить теги. Голлум недоступен?", loadTags)
      );
    }
  };

  if (autoload) {
    loadTags();
  } else {
    elem.append(createLoadButton("Показать", loadTags));
  }

  return elem;
}

export function createTagsContainer(
  userName: string,
  name: string,
  getter: (userId: number) => Promise<string[]>,
  autoload = false
) {
  const elem = document.createElement("div");
  elem.classList.add("rpm-tags");

  const nameElem = document.createElement("h4");
  nameElem.textContent = name;

  const tagsList = createTagsSection(userName, getter, autoload);

  elem.append(nameElem, tagsList);

  return elem;
}
