export type NotificationKind = "info" | "success" | "error";

const LEAVE_ANIMATION_MS = 250;

function getContainer() {
  let container = document.querySelector<HTMLDivElement>(".rpm-toasts");
  if (!container) {
    container = document.createElement("div");
    container.classList.add("rpm-toasts");
    container.setAttribute("rpm-observer-ignore", "");
    document.body.append(container);
  }
  return container;
}

/**
 * Shows a toast in the corner of the page. Toasts stack, close on click and
 * disappear after `timeout` ms.
 */
export function sendNotification(
  title: string,
  description: string,
  timeout: number = 2000,
  html: boolean = false,
  kind: NotificationKind = "info"
) {
  const toast = document.createElement("div");
  toast.classList.add("rpm-toast", `rpm-toast-${kind}`);
  toast.setAttribute("role", kind === "error" ? "alert" : "status");

  const titleElem = document.createElement("div");
  titleElem.classList.add("rpm-toast-title");
  titleElem.textContent = title;

  const body = document.createElement("div");
  body.classList.add("rpm-toast-body");
  if (html) {
    body.innerHTML = description;
  } else {
    body.textContent = description;
  }

  const close = document.createElement("button");
  close.type = "button";
  close.classList.add("rpm-toast-close");
  close.setAttribute("aria-label", "Закрыть");
  close.textContent = "\u00d7";

  toast.append(titleElem, body, close);
  getContainer().append(toast);

  let timer: number | undefined;
  const dismiss = () => {
    clearTimeout(timer);
    if (toast.classList.contains("rpm-leaving")) return;
    toast.classList.add("rpm-leaving");
    setTimeout(() => toast.remove(), LEAVE_ANIMATION_MS);
  };

  toast.addEventListener("click", (e) => {
    // Let links inside the toast work
    if ((e.target as HTMLElement).closest("a")) return;
    dismiss();
  });

  // Hovering keeps the toast on screen
  const schedule = () => {
    timer = window.setTimeout(dismiss, timeout);
  };
  toast.addEventListener("mouseenter", () => clearTimeout(timer));
  toast.addEventListener("mouseleave", schedule);
  schedule();
}

export function notifyError(description: string) {
  sendNotification("Ошибка", description, 4000, false, "error");
}

export function notifySuccess(description: string) {
  sendNotification("Успешно", description, 2500, false, "success");
}
