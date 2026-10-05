interface LinkType {
  domains: string[];
  iconHtml: string;
  style?: string;
}

const linkTypes: LinkType[] = [
  // Telegram
  {
    domains: ["t.me"],
    iconHtml: `<svg xmlns="http://www.w3.org/2000/svg" class="rpm-story-icon icon icon--social__telegram"><use xlink:href="#icon--social__telegram"></use></svg>`,
    style: "fill: #24A1DE;",
  },
  // VK
  {
    domains: ["vk.com"],
    iconHtml: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon--social__vk"><use xlink:href="#icon--social__vk"></use></svg>`,
    style: "fill: black;",
  },
  // TIKTOK
  {
    domains: ["tiktok.com"],
    iconHtml: `<svg class="icon" fill="#000000" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/></svg>`,
  },
  // Boosty
  {
    domains: ["boosty.to"],
    iconHtml: `<svg class="icon" fill="#000000" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="50 50 217.4 197.4">
                <style type="text/css">
                  .st0{fill:#242B2C;}
                  .st1{fill:url(#SVGID_1_);}
                </style>
                <g id="sign">
                  <g id="b_1_">
                    <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="188.3014" y1="75.5591" x2="123.8106" y2="295.4895">
                      <stop offset="0" style="stop-color:#EF7829"/>
                      <stop offset="5.189538e-02" style="stop-color:#F07529"/>
                      <stop offset="0.3551" style="stop-color:#F0672B"/>
                      <stop offset="0.6673" style="stop-color:#F15E2C"/>
                      <stop offset="1" style="stop-color:#F15A2C"/>
                    </linearGradient>
                    <path class="st1" d="M87.5,163.9L120.2,51h50.1l-10.1,35c-0.1,0.2-0.2,0.4-0.3,0.6L133.3,179h24.8c-10.4,25.9-18.5,46.2-24.3,60.9    c-45.8-0.5-58.6-33.3-47.4-72.1 M133.9,240l60.4-86.9h-25.6l22.3-55.7c38.2,4,56.2,34.1,45.6,70.5C225.3,207,179.4,240,134.8,240    C134.5,240,134.2,240,133.9,240z"/>
                  </g>
                </g>
              </svg>`,
  },
];

export async function checkStoryLinks(story: HTMLDivElement) {
  function addIcon(linkType: LinkType, element: HTMLAnchorElement) {
    const elem = element.cloneNode() as HTMLAnchorElement;
    elem.innerHTML = linkType.iconHtml.trim();

    if (linkType.style) {
      elem.setAttribute("style", linkType.style);
    }
    elem.classList.add("rpm-story-icon");

    // Add before the title
    const titleElem = story.querySelector(".story__title");
    titleElem.prepend(elem);
  }

  const linkElems = Array.from(
    story.querySelectorAll(".story__content a")
  ) as HTMLAnchorElement[];
  linkElems.reverse();
  // Iterate reversibly so that the last link is added to the icon list

  linkTypeFor: for (const linkType of linkTypes) {
    for (const domain of linkType.domains) {
      for (const linkElem of linkElems) {
        if (linkElem.href.includes(domain)) {
          addIcon(linkType, linkElem);
          continue linkTypeFor;
        }
      }
    }
  }
}
