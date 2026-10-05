export const MODAL_STYLE = `
.rpm-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
  animation: rpm-fade-in 0.15s ease-out;
  outline: none;
}
.rpm-modal {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 440px;
  max-height: min(640px, 100%);
  overflow: hidden;
  border-radius: 16px;
  background: var(--rpm-bg);
  box-shadow: var(--rpm-shadow);
  font-size: 14px;
  line-height: 1.4;
  animation: rpm-pop-in 0.2s ease-out;
}
.rpm-modal-header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 12px 8px 20px;
  font-size: 18px;
  font-weight: 700;
}
button.rpm-modal-close {
  flex: none;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--rpm-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
button.rpm-modal-close:hover {
  background: var(--rpm-surface);
}
.rpm-modal-body {
  min-height: 0;
  margin: 0;
  padding: 4px 20px 16px;
  overflow-y: auto;
}
.rpm-modal-footer {
  display: flex;
  flex: none;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--rpm-border);
}

/* Reason picker */
.rpm-reason-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rpm-reason-option {
  padding: 10px 12px;
  border: 1px solid var(--rpm-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.rpm-reason-option:hover {
  background: var(--rpm-surface);
}
.rpm-reason-option:has(input[type="radio"]:checked) {
  border-color: var(--rpm-accent);
  background: var(--rpm-accent-soft);
}
.rpm-reason-option label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.rpm-reason-option input[type="radio"] {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--rpm-accent);
}
input.rpm-reason-input {
  box-sizing: border-box;
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--rpm-border);
  border-radius: 8px;
  background: var(--rpm-bg);
  color: inherit;
  font-size: 14px;
}
input.rpm-reason-input:focus {
  border-color: var(--rpm-accent);
  outline: none;
}

/* Votes list */
.rpm-votes-message {
  padding: 24px 0;
  color: var(--rpm-muted);
  text-align: center;
}
.rpm-vote-entry {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--rpm-border);
  overflow-wrap: anywhere;
}
.rpm-vote-entry:last-child {
  border-bottom: none;
}
.rpm-vote-sign {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
.rpm-vote-plus .rpm-vote-sign {
  background: var(--rpm-accent-soft);
  color: var(--rpm-accent);
}
.rpm-vote-minus .rpm-vote-sign {
  background: var(--rpm-danger-soft);
  color: var(--rpm-danger);
}
.rpm-vote-main {
  min-width: 0;
}
.rpm-vote-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
}
.rpm-user {
  font-weight: 600;
}
.rpm-vote-time {
  color: var(--rpm-muted);
  font-size: 12.5px;
}
.rpm-vote-text {
  margin-top: 2px;
}
.rpm-vote-link {
  display: inline-block;
  margin-top: 2px;
  color: var(--rpm-accent);
  font-size: 12.5px;
}
`;
