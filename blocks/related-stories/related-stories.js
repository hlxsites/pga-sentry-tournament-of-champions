import {
  makeLinksRelative,
  readBlockConfig,
  updateExternalLinks,
  fetchCors,
} from '../../scripts/scripts.js';

export default async function decorate(block) {
  // const stories = block.querySelectorAll('a');
  const videoPrefix = 'https://pga-tour-res.cloudinary.com/image/upload/c_fill,f_auto,g_face,h_311,q_auto,w_425/v1/';
  const damPrefix = 'https://www.pgatour.com';
  const config = readBlockConfig(block);
  const storiesURL = 'https://www.pgatour.com/bin/data/feeds/relatedcontent.json';
  const limit = config.limit || 5;
  block.innerHTML = '';

  const title = document.createElement('h3');
  title.textContent = 'Related to this story';
  block.append(title);

  // set placeholder content
  const ul = document.createElement('ul');
  block.append(ul);
  for (let i = 0; i < limit; i += 1) {
    const placeholder = document.createElement('li');
    placeholder.className = 'related-stories-placeholder';
    placeholder.innerHTML = `<a><div class="related-stories-story-image"></div>
      <div class="related-stories-story-body"></div></a>`;
    ul.append(placeholder);
  }

  const observer = new IntersectionObserver(async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      if (storiesURL) {
        // populate related stories content
        /* TODO: add CORS header, to be replaced with direct API */
        const directURL = `${storiesURL}/path=/content&tags=${config.tags.replace(/ /g, '')}&relatedTo=/content/the-players${window.location.pathname}&size=${limit}`;
        const resp = await fetchCors(directURL);
        const json = await resp.json();
        json.items.forEach((story, i) => {
          const prefix = story.image.startsWith('brightcove') ? videoPrefix : damPrefix;
          const li = document.createElement('li');
          li.classList.add('related-stories-story', `related-stories-story-${story.type}`);
          const video = story.videoId ? '<div class="related-stories-story-play"></div>' : '';
          const a = document.createElement('a');
          a.href = story.link;
          a.innerHTML = `
            <div class="related-stories-story-image">
              <picture><img src="${prefix}${story.image}" alt="${story.description}" /></picture>${video}
            </div>
            <div class="related-stories-story-body">
              ${story.franchise ? `<p>${story.franchise}</p>` : ''}
              <a href="${story.link}">${story.title}</a>
            </div>
          `;
          li.append(a);
          [...ul.children][i].replaceWith(li);
        });
      }
      makeLinksRelative(block);
      updateExternalLinks(block);
    }
  }, { threshold: 0 });

  observer.observe(block);
}
