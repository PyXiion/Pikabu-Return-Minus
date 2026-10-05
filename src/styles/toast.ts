export const TOAST_STYLE = `
.rpm-toasts {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 100001;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  width: min(320px, calc(100vw - 32px));
  pointer-events: none;
}
.rpm-toast {
  position: relative;
  box-sizing: border-box;
  padding: 12px 36px 12px 14px;
  border: 1px solid var(--rpm-border);
  border-left: 4px solid var(--rpm-accent);
  border-radius: 10px;
  background: var(--rpm-bg);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  font-size: 14px;
  line-height: 1.4;
  pointer-events: auto;
  cursor: pointer;
  animation: rpm-pop-in 0.25s ease-out;
  transition: opacity 0.25s, transform 0.25s;
}
.rpm-toast.rpm-leaving {
  opacity: 0;
  transform: translateX(-12px);
}
.rpm-toast-error {
  border-left-color: var(--rpm-danger);
}
.rpm-toast-title {
  font-weight: 700;
}
.rpm-toast-body {
  margin-top: 2px;
  color: var(--rpm-muted);
  overflow-wrap: anywhere;
}
.rpm-toast-body a {
  color: var(--rpm-accent);
}
.rpm-toast-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--rpm-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.rpm-toast-close:hover {
  background: var(--rpm-surface);
}
`;
