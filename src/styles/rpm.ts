export const RPM_STYLE = `
/* Author rating badge */
.rpm-user-rating {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  box-sizing: border-box;
  padding: 2px;
  border-radius: 999px;
  background: var(--color-black-alpha-005, rgba(0, 0, 0, 0.05));
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  vertical-align: middle;
  user-select: none;
}
.rpm-user-rating span {
  display: inline-block;
  text-align: center;
}
.rpm-user-rating .rpm-pluses,
.rpm-user-rating .rpm-minuses {
  padding: 5px 8px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.rpm-pluses {
  color: var(--rpm-accent);
}
.rpm-minuses {
  color: var(--rpm-danger);
}
.rpm-pluses::before {
  content: "+";
}
.rpm-minuses::before {
  content: "\\2212";
}
.rpm-user-rating .rpm-pluses:hover {
  background: var(--rpm-accent-soft);
}
.rpm-user-rating .rpm-minuses:hover {
  background: var(--rpm-danger-soft);
}
.rpm-user-rating .rpm-rating {
  padding: 0 4px;
  font-weight: 700;
}
.rpm-user-rating[rpm-own-vote="1"] .rpm-pluses {
  background: var(--rpm-accent);
  color: #fff;
}
.rpm-user-rating[rpm-own-vote="-1"] .rpm-minuses {
  background: var(--rpm-danger);
  color: #fff;
}
.rpm-user-rating .rpm-more-votes {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--rpm-muted);
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.15s, background-color 0.15s;
}
.rpm-user-rating .rpm-more-votes:hover {
  background: var(--rpm-surface);
  opacity: 1;
}
.rpm-user-rating .rpm-more-votes svg {
  width: 14px;
  height: 14px;
}
.story__user-info .rpm-user-rating,
.story__main .rpm-user-rating {
  margin-right: 10px;
}
.comment__header .rpm-user-rating {
  margin-left: auto;
}
.rpm-user-rating + .comment__right {
  margin-left: unset;
}

/* Loading skeleton (replaced by the numbers, removed if RPM is unavailable) */
.rpm-user-rating:has(.rpm-loading) {
  padding: 0;
}
.rpm-loading {
  display: block;
  width: 96px;
  height: 26px;
  margin: 0;
  border-radius: 999px;
  background: linear-gradient(
      90deg,
      transparent 25%,
      rgba(128, 128, 128, 0.25) 50%,
      transparent 75%
    )
    0 0 / 200% 100%;
  animation: rpm-shimmer 1.2s linear infinite;
}

/* Note with the reason of your own vote */
.rpm-vote-reason-container {
  margin: 8px 16px;
  padding: 10px 14px;
  border-left: 4px solid var(--rpm-accent);
  border-radius: 10px;
  background: var(--rpm-surface);
  font-size: 14px;
  line-height: 1.4;
}
.rpm-vote-reason-title {
  margin: 0 0 2px;
  color: var(--rpm-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.rpm-vote-reason {
  margin: 0;
  font-weight: 400;
}

/* Placeholder that replaces a hidden story */
.rpm-placeholder {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  margin: 0 0 10px;
  padding: 8px 14px 8px 8px;
  border: 1px solid var(--rpm-border);
  border-radius: var(--rpm-radius);
  background: var(--rpm-bg);
  font-size: 14px;
  text-align: left;
}
.rpm-placeholder .collapse-button {
  position: relative;
  flex: none;
  left: auto;
  top: auto;
  margin: 0;
  translate: none;
}
.rpm-placeholder-text {
  display: flex;
  flex: 1 1 220px;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 220px;
}
.rpm-placeholder-title {
  max-width: 100%;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rpm-placeholder .rpm-user-info-container {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
}
.rpm-placeholder .rpm-user-info-container .story__user-info {
  flex-wrap: wrap;
  row-gap: 4px;
}
.rpm-placeholder .rpm-user-rating {
  margin-right: 0;
}
.rpm-placeholder:has(.collapse-button_active) + article {
  display: none;
}
.mv .rpm-placeholder {
  flex-wrap: wrap;
  font-size: 13px;
}
`;
