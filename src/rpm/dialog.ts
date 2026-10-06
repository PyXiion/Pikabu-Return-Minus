import { createElementWithClass } from "../utils/dom";

export interface DialogButton {
  label: string;
  /** Classes of the button, e.g. "rpm-btn rpm-btn-primary" */
  className: string;
  onClick: (overlay: HTMLDivElement) => any;
}

/**
 * Creates and appends a generic modal dialog to the document.
 * Closes on Escape and backdrop click; closing buttons come from `buttons`.
 * @param title - The title of the modal.
 * @param bodyContent - The body content of the modal.
 * @param buttons - The buttons to display in the footer.
 * @returns - The overlay element containing the modal.
 */
export function createModalDialog(title: string, bodyContent: HTMLElement, buttons: DialogButton[]): HTMLDivElement {
  // Only one RPM dialog at a time
  document.querySelectorAll(".rpm-modal-overlay").forEach((e) => e.remove());

  const overlay = createElementWithClass("div", "rpm-modal-overlay");
  overlay.tabIndex = -1;

  const modal = createElementWithClass("div", "rpm-modal");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", title);

  const header = createElementWithClass("div", "rpm-modal-header");
  const heading = createElementWithClass("span");
  heading.textContent = title;

  header.append(heading);

  const body = createElementWithClass("div", "rpm-modal-body");
  body.appendChild(bodyContent);

  const footer = createElementWithClass("div", "rpm-modal-footer");

  buttons.forEach(({ label, className, onClick }) => {
    const button = createElementWithClass("button", ...className.split(" "));
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => onClick(overlay));
    footer.appendChild(button);
  });

  modal.append(header, body, footer);
  overlay.appendChild(modal);

  // Listeners live on the overlay, so nothing leaks when it is removed
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.remove();
  });

  document.body.appendChild(overlay);
  (bodyContent.querySelector<HTMLElement>("input") ?? overlay).focus();

  return overlay;
}
