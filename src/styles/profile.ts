/** Mini-profile and profile page additions (notes, Gollum tags, last comments) */
export const PROFILE_STYLE = `
.mini-profile[rpm-affected] {
  width: 400px;
}
/* Private note */
.rpm-mini-profile-note {
  resize: none;
}
.rpm-mini-profile-note-display {
  display: block;
  min-height: 1.4em;
  cursor: text;
  overflow-wrap: anywhere;
}
.rpm-mini-profile-note-display.rpm-note-empty {
  color: var(--rpm-muted);
  font-size: 0.9em;
}
.rpm-powered {
  display: inline-block;
  width: 100%;
  font-size: 0.8em;
  opacity: 0.8;
  text-align: right;
}

/* Gollum statistics */
.rpm-gollum-stats {
  box-sizing: border-box;
  width: 100%;
  padding: 15px;
}
.rpm-gollum-stats > * {
  margin-bottom: 14px;
}
.rpm-gollum-stats > *:last-child {
  margin-bottom: 0;
}
.rpm-tags h4,
.rpm-last-comments > h4 {
  margin: 0 0 6px;
  color: var(--rpm-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.rpm-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.8rem;
}
.rpm-tags-tag {
  padding: 0.1em 0.7em;
  border-radius: 999px;
  background: var(--rpm-accent-soft);
}

/* Empty / failed states and small buttons */
.rpm-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  color: var(--rpm-muted);
  font-size: 0.9em;
}
button.rpm-btn-small {
  padding: 5px 12px;
  font-size: 13px;
}
.rpm-last-comments > button.rpm-btn {
  display: block;
  width: 100%;
  text-align: center;
}

/* Last comments from Gollum */
.rpm-last-comments-container {
  height: max-content;
  max-height: 400px;
  margin-bottom: 10px;
  overflow-y: auto;
  border-radius: var(--rpm-radius);
  resize: vertical;
}
section .rpm-last-comments-container {
  max-height: unset;
}
.rpm-comment-no-js .comment__tools,
.rpm-comment-no-js .comment__controls,
.rpm-comment-no-js .comment-hidden-group {
  display: none;
}
.rpm-comment-container {
  margin-bottom: 7px;
  padding: 6px 1em;
  overflow: hidden;
  border-radius: var(--rpm-radius);
  background: var(--rpm-surface);
}
.rpm-comment-container > a {
  display: block;
  width: 100%;
  margin-bottom: 5px;
  text-align: center;
}
.rpm-comment-container .comment__tools > *:not([data-role="link"]) {
  display: none;
}
.rpm-comment-container > .comment,
.rpm-comment-container > .comments {
  padding: 5px 5px 0;
  border-radius: var(--rpm-radius);
  background: var(--rpm-bg);
}
.rpm-comment-preview {
  text-align: center;
}
.rpm-highlight-comment > .comment__body {
  padding: 5px;
  border: 3px dotted var(--rpm-accent);
  border-radius: 10px;
}

/* Two-column mini-profile (declared last: it must win over the generic widths above) */
.mini-profile.rpm-mini-profile-horizontal {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  max-height: 450px;
  min-width: 700px;
  max-width: 700px;
}
.mini-profile.rpm-mini-profile-horizontal > * {
  width: 50%;
}
`;
