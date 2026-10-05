export const RATING_STYLE = `
.story__footer .story__rating-up {
  margin-right: 5px !important;
}
.story__rating-count {
  margin: 7px 0;
}
.comment__rating-down .comment__rating-count {
  margin-right: 8px;
}
.comment__rating-down,
.comment__rating-up {
  padding: 4px;
}

/* Plus / minus counters next to the summary rating */
.rpm-new-rating-counter {
  color: var(--rating-text);
  font-size: 1em;
}
.story__rating-block .rpm-new-rating-counter {
  font: var(--rating-textCounter);
}
.comment__rating .rpm-new-rating-counter {
  margin: 0 4px;
  font: var(--s-text-label-main-typRegular-style) var(--s-text-label-main-typRegular-weight) var(--s-text-label-main-size)/var(--s-text-label-main-lh) var(--s-text-label-main-font);
}
.rpm-new-rating-counter.rpm-counter-plus {
  color: var(--rpm-accent);
}
.rpm-new-rating-counter.rpm-counter-minus {
  color: var(--rpm-danger);
}

/* Plus/minus ratio bar */
.rpm-rating-bar {
  position: absolute;
  top: 5%;
  right: -9.5px;
  width: 4px;
  height: 90%;
  overflow: hidden;
  border-radius: 4px;
  background: var(--rpm-danger);
}
.rpm-rating-bar-inner {
  border-radius: 4px;
  background: var(--rpm-accent);
  transition: height ease-in-out 0.5s;
}
.comment__body {
  position: relative;
}
.comment .rpm-rating-bar {
  top: 15px;
  left: -10px;
  height: 70px;
}
`;
