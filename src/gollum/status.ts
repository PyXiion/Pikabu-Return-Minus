/** Muted message with an optional retry button, used for empty and failed states. */
export function createStatusMessage(text: string, onRetry?: () => void) {
  const elem = document.createElement("div");
  elem.classList.add("rpm-status");

  const message = document.createElement("span");
  message.textContent = text;
  elem.append(message);

  if (onRetry) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.classList.add("rpm-btn", "rpm-btn-small");
    retry.textContent = "Повторить";
    retry.addEventListener("click", onRetry);
    elem.append(retry);
  }

  return elem;
}

export function createLoadButton(text: string, onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("rpm-btn", "rpm-btn-small");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}
