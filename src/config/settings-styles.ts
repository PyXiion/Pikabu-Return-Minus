/**
 * Styles of the settings window. DOM comes from GM_config (id "prm") and is
 * reshaped by ui.ts. Colors reuse Pikabu theme variables so light/dark themes work.
 */
export const SETTINGS_STYLE = `
#prm {
  position: fixed !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  border: none !important;
  border-radius: 0 !important;
  background: rgba(0, 0, 0, 0.55) !important;
  padding: 24px 16px;
  box-sizing: border-box;
  overflow: hidden;
  outline: none;
}
#prm [hidden] {
  display: none !important;
}
#prm_wrapper {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-width: 980px;
  height: min(780px, 100%);
  margin: 0 auto;
  padding: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--rpm-bg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
}

/* Header */
#prm .rpm-header {
  text-align: left;
  display: flex;
  flex: none;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  height: auto;
  padding: 16px 24px;
  border-bottom: 1px solid var(--rpm-border);
}
#prm .rpm-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}
#prm .rpm-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 2px;
}
#prm .rpm-links a {
  margin: 0;
  font-size: 13px;
  color: var(--rpm-accent);
  text-decoration: none;
}
#prm .rpm-links a:hover {
  text-decoration: underline;
}
#prm input.rpm-search {
  box-sizing: border-box;
  width: 240px;
  max-width: 100%;
  margin: 0 0 0 auto;
  padding: 8px 12px;
  border: 1px solid var(--rpm-border);
  border-radius: 8px;
  background: var(--rpm-surface);
  color: inherit;
  font-size: 14px;
}

/* Navigation + content */
#prm .rpm-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
#prm .rpm-nav {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 2px;
  width: 200px;
  padding: 12px;
  overflow-y: auto;
  border-right: 1px solid var(--rpm-border);
}
#prm .rpm-nav-item {
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: none;
  color: inherit;
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}
#prm .rpm-nav-item:hover {
  background: var(--rpm-surface);
}
#prm .rpm-nav-item.rpm-active {
  background: var(--rpm-accent);
  color: #fff;
  font-weight: 600;
}
#prm .rpm-content {
  flex: 1;
  min-width: 0;
  padding: 8px 28px 28px;
  overflow-y: auto;
}
#prm .rpm-panel {
  display: block;
  margin: 0 0 12px;
  padding: 0;
  overflow: visible;
  border-radius: 0;
  background: none;
}
#prm .rpm-panel-head {
  padding: 16px 0 4px;
}
#prm .rpm-panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
#prm .rpm-panel-desc {
  margin: 4px 0 0;
  color: var(--rpm-muted);
  font-size: 13px;
}
#prm .rpm-searching .rpm-panel-head {
  padding-top: 20px;
}
#prm .rpm-empty {
  padding: 48px 0;
  color: var(--rpm-muted);
  text-align: center;
}

/* Rows */
#prm .rpm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 20px;
  width: auto;
  margin: 0;
  padding: 12px 0;
  border-bottom: 1px solid var(--rpm-border);
  font-size: 14px;
}
#prm .rpm-row-checkbox {
  cursor: pointer;
}
#prm .rpm-row-label {
  flex: 1;
  min-width: 0;
}
#prm .rpm-row-title {
  display: block;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
#prm .rpm-row-checkbox .rpm-row-title {
  cursor: pointer;
}
#prm .rpm-row-desc {
  margin-top: 2px;
  color: var(--rpm-muted);
  font-size: 12.5px;
  overflow-wrap: anywhere;
}
#prm .rpm-row-control {
  display: flex;
  flex: none;
  align-items: center;
}
#prm .rpm-row-error {
  flex-basis: 100%;
  color: var(--rpm-danger);
  font-size: 12px;
}

/* Text fields stack: title on top, input below */
#prm .rpm-row.rpm-row-text {
  flex-wrap: wrap;
}
#prm .rpm-row.rpm-row-text .rpm-row-control {
  flex: 1 0 100%;
}

/* Controls */
#prm .rpm-row input[type="text"],
#prm .rpm-row select {
  box-sizing: border-box;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--rpm-border);
  border-radius: 8px;
  background: var(--rpm-surface);
  color: inherit;
  font-size: 14px;
  line-height: 1.2;
}
#prm .rpm-row-int input[type="text"],
#prm .rpm-row-number input[type="text"] {
  width: 96px;
  text-align: right;
}
#prm .rpm-row-text input[type="text"] {
  width: 100%;
}
#prm .rpm-row input[type="text"]:focus,
#prm .rpm-row select:focus,
#prm input.rpm-search:focus {
  border-color: var(--rpm-accent);
  outline: none;
}
#prm .rpm-row input[type="text"].rpm-invalid,
#prm .rpm-row input[type="text"].rpm-invalid:focus {
  border-color: var(--rpm-danger);
}
#prm .rpm-row-button button,
#prm .rpm-row input[type="button"] {
  margin: 0;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: var(--rpm-accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Switch */
#prm .rpm-row-checkbox input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  flex: none;
  width: 42px;
  height: 24px;
  margin: 0;
  border: none;
  border-radius: 12px;
  background: var(--color-black-500, #c8c8c8);
  cursor: pointer;
  transition: background-color 0.2s;
}
#prm .rpm-row-checkbox input[type="checkbox"]::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}
#prm .rpm-row-checkbox input[type="checkbox"]:checked {
  background: var(--rpm-accent);
}
#prm .rpm-row-checkbox input[type="checkbox"]:checked::after {
  transform: translateX(18px);
}
#prm .rpm-row-checkbox input[type="checkbox"]:focus-visible,
#prm .rpm-nav-item:focus-visible {
  outline: 2px solid var(--rpm-accent);
  outline-offset: 2px;
}

/* Footer */
#prm .rpm-footer {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border-top: 1px solid var(--rpm-border);
}
#prm .rpm-reset {
  margin-right: auto;
  color: var(--rpm-muted);
  font-size: 12.5px;
}
#prm .rpm-dirty {
  color: #d98a00;
  font-size: 12.5px;
}

@media only screen and (max-width: 768px) {
  #prm {
    padding: 0;
  }
  #prm_wrapper {
    height: 100%;
    border-radius: 0;
  }
  #prm .rpm-header {
    padding: 12px 16px;
  }
  #prm input.rpm-search {
    width: 100%;
    margin: 0;
  }
  #prm .rpm-body {
    flex-direction: column;
  }
  #prm .rpm-nav {
    flex-direction: row;
    width: auto;
    padding: 8px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid var(--rpm-border);
  }
  #prm .rpm-nav-item {
    width: auto;
    white-space: nowrap;
  }
  #prm .rpm-content {
    padding: 4px 16px 20px;
  }
  #prm .rpm-footer {
    flex-wrap: wrap;
    padding: 12px 16px;
  }
  #prm .rpm-reset {
    flex-basis: 100%;
    margin: 0;
  }
}
`;
