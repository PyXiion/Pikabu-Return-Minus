/** Custom color themes (applied through Pikabu's own data-theme attribute) */
export const THEMES_STYLE = `
.rpm-theme-picker {
  flex: 1 0 0px;
}
.rpm-theme-picker:after {
  content: attr(data-name)
}
.theme-picker__buttons {
  flex-wrap: wrap;
  flex-direction: row;
  gap: 10px;
  justify-content: center;
}
.theme-picker__button {
  min-width: fit-content;
  max-width: max-content;
}
.theme-picker__button[data-type="default"] {
  max-width: unset;
  width: 35px;
}  /* SUNSET GLOW */
.rpm-theme-picker[data-type="sunset-glow"] {
  background: linear-gradient(135deg, #6b1d52, #b02e78, #f77fba);
  border: 2px solid #8e2465;
  border-radius: 8px;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="sunset-glow"]:hover {
  transform: scale(1.1);
}
html[data-theme="sunset-glow"] {
  --color-primary-900: #6b1d52;
  --color-primary-800: #8e2465;
  --color-primary-700: #b02e78;
  --color-primary-500: #d14791;
  --color-primary-400: #f77fba;
  --color-primary-200: #fbc8e4;
  --color-primary-100: #fdeaf4;
}  /* OCEAN BREEZE */
.rpm-theme-picker[data-type="ocean-breeze"] {
  background: linear-gradient(135deg, #012a4a, #014f86, #61a5c2);
  border: 2px solid #013a63;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="ocean-breeze"]:hover {
  transform: scale(1.1);
}
html[data-theme="ocean-breeze"] {
  --color-primary-900: #012a4a;
  --color-primary-800: #013a63;
  --color-primary-700: #014f86;
  --color-primary-500: #2a6f97;
  --color-primary-400: #61a5c2;
  --color-primary-200: #a9d6e5;
  --color-primary-100: #d9f1f6;
}  /* FOREST */
.rpm-theme-picker[data-type="forest-whisper"] {
  background: linear-gradient(135deg, #143601, #275d03, #63b530);
  border: 2px solid #1c4a02;
  border-radius: 8px;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="forest-whisper"]:hover {
  transform: scale(1.1);
}
html[data-theme="forest-whisper"] {
  --color-primary-900:rgb(27, 68, 3);
  --color-primary-800:rgb(32, 80, 4);
  --color-primary-700:rgb(72, 170, 7);
  --color-primary-500: #398d05;
  --color-primary-400: #63b530;
  --color-primary-200: #a9e8a4;
  --color-primary-100:rgb(227, 248, 227);
}  /* LAVENDER DREAMS */
.rpm-theme-picker[data-type="lavender-dreams"] {
  background: linear-gradient(135deg, #4c1d6f, #70308e, #cfa5e0);
  border: 2px solid #5e267e;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="lavender-dreams"]:hover {
  transform: scale(1.1);
}
html[data-theme="lavender-dreams"] {
  --color-primary-900:rgb(141, 92, 179);
  --color-primary-800:rgb(117, 57, 151);
  --color-primary-700:rgb(132, 73, 160);
  --color-primary-500: #9b5cb2;
  --color-primary-400: #cfa5e0;
  --color-primary-200:rgb(236, 223, 245);
  --color-primary-100: #f7ecfc;
}  /* FIRE EMBER */
.rpm-theme-picker[data-type="fire-ember"] {
  background: linear-gradient(135deg, #7f1d1d, #b91c1c, #f87171);
  border: 2px solid #991b1b;
  border-radius: 8px;
  transition: transform 0.2s ease;
}
.rpm-theme-picker[data-type="fire-ember"]:hover {
  transform: scale(1.1);
}
html[data-theme="fire-ember"] {
  --color-primary-900:rgb(145, 42, 42);
  --color-primary-800:rgb(172, 42, 42);
  --color-primary-700:rgb(211, 32, 32);
  --color-primary-500:rgb(241, 62, 62);
  --color-primary-400:rgb(252, 138, 138);
  --color-primary-200:rgb(253, 185, 185);
  --color-primary-100: #fee2e2;
}  /* POLKA (mosaic before) */
html[data-theme="mosaic"] .app {
  background-image:  radial-gradient(rgba(68, 77, 247, 0.5) 1.3px, transparent 1.3px), radial-gradient(rgba(68, 77, 247, 0.5) 1.3px, transparent 1.3px);
  background-repeat: repeat;
  background-size: 66px 66px;
  background-position: 0 0, 33px 33px;
}
.rpm-theme-picker[data-type="mosaic"] {
  background-image:  radial-gradient(rgba(68, 77, 247, 0.5) 1.3px, transparent 1.3px), radial-gradient(rgba(68, 77, 247, 0.5) 1.3px, rgba(0, 0, 0, 0.1) 1.3px);
  background-repeat: repeat;
  background-size: 10px 10px;
  background-position: 0 0, 5px 5px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.rpm-theme-picker[data-type="mosaic"]:after {
  color: var(--color-black-800);
}
.rpm-theme-picker[data-type="mosaic"]:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}  /* WHITE TEXT */
html[data-theme="lavender-dreams"] .achievements-progress__bar,
html[data-theme="fire-ember"] .achievements-progress__bar,
html[data-theme="forest-whisper"] .achievements-progress__bar,
html[data-theme="ocean-breeze"] .achievements-progress__bar,
html[data-theme="sunset-glow"] .achievements-progress__bar {
  color: white;
}
`;
