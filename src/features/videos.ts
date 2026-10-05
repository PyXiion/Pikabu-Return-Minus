export function processPostVideos(
  story: HTMLDivElement
) {
  function addButton(link: string, videoControls: HTMLDivElement) {
    const a = document.createElement("a");
    a.classList.add("rpm-download-video-button");

    const name = link.split("/").pop(); // "https://example/com/some_cool_video.mp4" -> "some_cool_video.mp4"
    const extension = name.split(".").slice(1).join("."); // "some_cool_video.mp4" -> "mp4" (and "video.av1.mp4" -> "av1.mp4")

    if (extension) {
      a.setAttribute('download', '');
    }
    a.target = '_blank';

    a.href = link;
    a.textContent = extension || 'Источник';

    // add link to controls
    videoControls.parentElement.insertBefore(a, videoControls.nextSibling);
  }

  const possibleAttributes = [
    'data-webm', 'data-av1'
  ];

  const videos = story.querySelectorAll('.story-block_type_video');
  for (const videoElem of videos) {
    const player = videoElem.querySelector('.player')
    if (!player) continue;
    const type = player.getAttribute('data-type');



    if (type === 'video') {
      const url = player.getAttribute('data-source');
      addButton(url, videoElem as HTMLDivElement);
    } else if (type === 'video-file') {
      const dataSource = player.getAttribute('data-source');
      if (dataSource) {
        addButton(dataSource + '.mp4', videoElem as any);
      }

      for (const attr of possibleAttributes) {
        if (player.hasAttribute(attr) && player.getAttribute(attr)) {
          addButton(player.getAttribute(attr), videoElem as any);
        }
      }
    }
  }
}
