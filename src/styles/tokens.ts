/**
 * Design tokens shared by every RPM surface (settings, dialogs, toasts, badges).
 * They reuse Pikabu's theme variables, so light/dark and custom themes just work.
 */
export const TOKENS_STYLE = `
:root {
  --rpm-bg: var(--color-bright-800, #fff);
  --rpm-surface: var(--color-black-430, #f2f2f2);
  --rpm-border: var(--color-black-440, rgba(0, 0, 0, 0.1));
  --rpm-muted: var(--color-black-700, #777);
  --rpm-accent: var(--color-primary-700, #6cb33f);
  --rpm-accent-soft: var(--color-primary-200, #e3f2d9);
  --rpm-danger: var(--color-danger-800, #e5484d);
  --rpm-danger-soft: var(--color-danger-200, #fde3e3);
  --rpm-radius: 12px;
  --rpm-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
}

@keyframes rpm-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes rpm-pop-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes rpm-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .rpm-modal-overlay, .rpm-modal, .rpm-toast, .rpm-loading {
    animation: none !important;
    transition: none !important;
  }
}

/* Buttons */
button.rpm-btn,
a.rpm-btn {
  display: inline-block;
  box-sizing: border-box;
  margin: 0;
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  background: var(--rpm-surface);
  color: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition: filter 0.15s;
}
button.rpm-btn:hover,
a.rpm-btn:hover {
  filter: brightness(0.95);
}
button.rpm-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
button.rpm-btn-primary,
a.rpm-btn-primary {
  background: var(--rpm-accent);
  color: #fff;
  font-weight: 600;
}
button.rpm-btn:focus-visible {
  outline: 2px solid var(--rpm-accent);
  outline-offset: 2px;
}

/* Small chip, e.g. the reason a story was hidden */
.rpm-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--rpm-surface);
  color: var(--rpm-muted);
  font-size: 12.5px;
  line-height: 1.4;
}
`;
