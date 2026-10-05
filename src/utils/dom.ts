import { info } from "./log";

/**
 * Utility function to create an element and assign multiple classes.
 * @param {string} tag - The HTML tag name.
 * @param {...string} classes - The class names to assign.
 * @returns {HTMLElement} The created element.
 */
export function createElementWithClass<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  ...classes: string[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tagName);
  elem.classList.add(...classes);
  return elem;
}

export function waitForElement(
  selector,
  timeout = 5000,
  parent = null
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    parent = parent ?? document;

    const checkExistence = () => {
      const element = parent.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime >= timeout) {
        reject(
          new Error(
            `Element with selector "${selector}" not found within ${timeout}ms`
          )
        );
      } else {
        setTimeout(checkExistence, 50);
      }
    };

    checkExistence();
  });
}

export function addCss(css: string) {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = css;
  // is added to the end of the body because it must override some of the original styles
  document.body.appendChild(styleSheet);
  info("Добавлен CSS");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
