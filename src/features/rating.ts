export function getRealRating(value: number, vid: number | string, authorId: number) {
  // thanks to Pikabu fixes
  const OFFSET = 253537024;
  const MOD_O = 99;
  const MOD_R = 98;

  if (value >= 0) {
    return value;
  }

  vid = parseInt(String(vid).replace(/\D/g, ''), 10);

  const a = (vid % MOD_O) + 1;
  const l = authorId % MOD_R;
  return Math.floor((-value - l) / a - OFFSET);
}

export function replaceRating(ratingElem: HTMLDivElement, vote: number, pluses: number, minuses: number, isComment = false, onChange: ((pluses: number, minuses: number) => void) = null) {
  const summary = GM_config.get('summary');
  const shouldCreateOtherCounters = isComment ? GM_config.get('commentCounters') : GM_config.get('storyCounters');

  const ratingBlock = ratingElem.parentElement as HTMLDivElement;

  const plusBtn = ratingBlock.querySelector('.story__rating-up, .comment__rating-up') as HTMLButtonElement;
  const minusBtn = ratingBlock.querySelector('.story__rating-down, .comment__rating-down') as HTMLButtonElement;

  let rating = pluses - minuses;
  if (summary) {
    ratingElem.textContent = (rating + vote).toString();
  } else {
    ratingElem.style.display = 'none';
  }


  let plusesElem, minusesElem;
  if (shouldCreateOtherCounters) {
    plusesElem = document.createElement('div');
    minusesElem = document.createElement('div');

    plusesElem.classList.add('rpm-new-rating-counter', 'rpm-counter-plus');
    minusesElem.classList.add('rpm-new-rating-counter', 'rpm-counter-minus');

    ratingBlock.insertBefore(plusesElem, ratingElem)
    ratingBlock.insertBefore(minusesElem, ratingElem.nextSibling);

    plusesElem.textContent = (pluses + (vote === 1 ? 1 : 0)).toString();
    minusesElem.textContent = (minuses + (vote === -1 ? 1 : 0)).toString();
  }

  const onClick = (btn: number) => {
    if (btn === vote) {
      vote -= btn;
    } else {
      vote += btn;
    }

    if (onChange)
      onChange(pluses + (vote === 1 ? 1 : 0), minuses + (vote === -1 ? 1 : 0));

    if (shouldCreateOtherCounters && plusesElem && minusesElem) {
      plusesElem.textContent = (pluses + (vote === 1 ? 1 : 0)).toString();
      minusesElem.textContent = (minuses + (vote === -1 ? 1 : 0)).toString();
    }


    if (summary)
      setTimeout(() => ratingElem.innerHTML = (rating + vote).toString(), 5);
  };

  plusBtn.addEventListener('click', () => onClick(1));
  minusBtn.addEventListener('click', () => onClick(-1));
}
