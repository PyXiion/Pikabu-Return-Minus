export const MISC_STYLE = `
/* Block author forever */
.rpm-block-author {
  display: flex;
  align-items: center;
  margin-right: 24px;
  padding: 0;
  overflow: hidden;
  background: none;
  cursor: pointer;
}
.rpm-block-author:hover * {
  fill: var(--rpm-danger);
}
.story__footer-tools-inner .rpm-block-author {
  margin-right: auto;
  margin-left: 8px;
  overflow: visible;
  transform: scale(1.3);
}

/* Video source links */
.rpm-download-video-button {
  display: inline-block;
  margin-left: 15px;
}

/* Social icons in story titles */
.rpm-story-icon {
  width: 24px;
  height: 24px;
  margin-right: 6px;
  padding: 0 4px;
  border-radius: 3px;
  vertical-align: text-top;
}
.rpm-story-icon svg {
  width: 16px;
  height: 16px;
  margin: 0;
  padding: 2px 0;
  transition: all ease 300ms;
}
.rpm-story-icon:hover svg {
  width: 18px;
  height: 18px;
}

/* Settings entry point on the mobile site */
.rpm-open-settings-button {
  width: 100%;
  margin-top: 10px;
  font-size: 0.9em;
  text-align: center;
}

/* "Unroll all comments" button */
.comment__more:has(+ .rpm-unroll-all),
.rpm-unroll-all {
  --gap: 10px;
  width: calc(50% - var(--gap) / 2);
  margin-right: var(--gap);
  text-align: center;
}
.rpm-unroll-all {
  display: none;
  margin: auto 0;
  background-color: var(--rpm-accent);
  color: #fff;
}
.comment__more + .rpm-unroll-all {
  display: inline-block;
}
`;
