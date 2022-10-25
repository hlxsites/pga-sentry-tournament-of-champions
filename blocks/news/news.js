import {
  makeLinksRelative,
  readBlockConfig,
  toClassName,
  updateExternalLinks,
  fetchPlaceholders,
} from '../../scripts/scripts.js';

async function mergeLocalNews(feed, maxItems) {
  const resp = await fetch('/query-index.json');
  const json = await resp.json();
  const newerThan = feed.items[feed.items.length - 1].created;
  const matched = json.data.filter((item) => {
    if (item.date) {
      const itemDate = new Date(Math.round((item.date - (25567 + 1)) * 86400 * 1000)).valueOf();
      item.created = itemDate;
      item.link = item.path;
      item.type = 'article';
      return (itemDate > newerThan);
    }
    return false;
  });
  // check feed items for relative links
  feed.items.map((item) => {
    const { link } = item;
    const { host, pathname } = new URL(link);
    if (host.includes('pgatour.com')) {
      const splitPath = `/${pathname.split('/').slice(3).join('/')}`;
      const match = matched.find((m) => splitPath.includes(m.path));
      if (match) item.link = splitPath;
    }
    return item;
  });
  const merged = [...feed.items, ...matched];
  const deduped = [...new Map(merged.map((m) => [
    new URL(m.link, window.location.href).pathname.split('.')[0],
    m,
  ])).values()];
  const sorted = deduped.sort((e1, e2) => e2.created - e1.created);
  feed.items = sorted.slice(0, maxItems);
}

function filterNews(e) {
  const button = e.target.closest('button');
  const block = button.closest('.block');
  const feed = block.querySelector('ul');
  const filter = button.getAttribute('data-filter');
  // update button
  const buttons = block.querySelectorAll('.news .button-container > button');
  buttons.forEach((btn) => btn.setAttribute('aria-selected', false));
  button.setAttribute('aria-selected', true);
  // reset feed height
  feed.style.removeProperty('height');
  // filter items
  const items = block.querySelectorAll('.news .news-item');
  items.forEach((item) => item.classList.remove('news-filtered'));
  if (filter.includes('article')) {
    items.forEach((item) => {
      const itemType = [...item.classList][1];
      if (!itemType.includes('article')) item.classList.add('news-filtered');
    });
  } else if (filter.includes('video')) {
    items.forEach((item) => {
      const itemType = [...item.classList][1];
      if (!itemType.includes('video')) item.classList.add('news-filtered');
    });
  }
}

function toggleShowLessButton(feed) {
  const block = feed.closest('.block');
  const lessButton = block.querySelector('button[data-show="less"]');
  const feedHeight = feed.offsetHeight;
  const rowHeight = 311; /* match .news-item height + gap */
  if (feedHeight > rowHeight) {
    lessButton.disabled = false;
  } else {
    lessButton.disabled = true;
  }
}

function paginateNews(e) {
  const button = e.target.closest('button');
  const block = button.closest('.block');
  const feed = block.querySelector('ul');
  const type = button.getAttribute('data-show');
  const feedHeight = feed.offsetHeight;
  const rowHeight = 311; /* match .news-item height + gap */
  if (type === 'more') {
    feed.style.height = `${feedHeight + rowHeight}px`;
  } else if (type === 'less' && (feedHeight > rowHeight)) {
    feed.style.height = `${feedHeight - rowHeight}px`;
  }
  toggleShowLessButton(feed);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const videoPrefix = 'https://pga-tour-res.cloudinary.com/image/upload/c_fill,f_auto,g_face,h_311,q_auto,w_425/v1/';
  const damPrefix = 'https://www.pgatour.com';
  const newsURL = config.source;
  const limit = config.limit || 8;

  const pinnedItems = [];
  const rows = [...block.children];
  rows.forEach((row) => {
    const pic = row.querySelector('picture');
    const a = row.querySelector('a');
    if (pic && a) {
      pinnedItems.push({
        type: 'article',
        image: pic.querySelector('img').getAttribute('src'),
        title: a.innerText,
        link: a.href,
        pinned: true,
      });
    }
  });

  block.textContent = '';

  // set placeholder content
  const ul = document.createElement('ul');
  block.append(ul);
  for (let i = 0; i < 8; i += 1) {
    const placeholder = document.createElement('li');
    placeholder.className = 'news-placeholder';
    ul.append(placeholder);
  }

  const observer = new IntersectionObserver(async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      // populate news content
      /* TODO: add CORS header, to be replaced with direct API */
      let directURL;
      if (config.tags) {
        const tags = config.tags.replace(/ /g, '').split(',').join('+');
        directURL = `${newsURL}/tags=${tags}&size=${limit - pinnedItems.length}`;
      } else {
        const placeholders = await fetchPlaceholders();
        directURL = `${newsURL}/path=/content&tags=${placeholders.newsTags}&size=${limit - pinnedItems.length}`;
      }
      const resp = await fetch(`https://little-forest-58aa.david8603.workers.dev/?url=${encodeURIComponent(directURL)}`);
      const json = await resp.json();

      await mergeLocalNews(json, config.limit);

      [...pinnedItems, ...json.items].forEach((item, idx) => {
        let prefix = '';
        if (item.image.startsWith('brightcove')) prefix = videoPrefix;
        if (item.image.startsWith('/content/dam')) prefix = damPrefix;
        const li = document.createElement('li');
        li.classList.add('news-item', `news-item-${item.type}`);
        const video = item.videoId ? '<div class="news-item-play"></div>' : '';
        const a = document.createElement('a');
        a.href = item.link;
        a.innerHTML = `
          <div class="news-item-image"><img loading="${idx < 8 ? 'eager' : 'lazy'}" src="${item.pinned ? '' : prefix}${item.image}"></div>
          <div class="news-item-body"><a href="${item.link}">${item.title}</a></div>
          ${video}
        `;
        li.append(a);
        const toReplace = ul.querySelector('.news-placeholder');
        if (toReplace) {
          toReplace.parentNode.replaceChild(li, toReplace);
        } else {
          ul.appendChild(li);
        }
      });

      // add filtering
      if (config.filter) {
        const filters = config.filter.split(',').map((f) => f.trim());
        const container = document.createElement('div');
        container.classList.add('button-container', 'news-filters');
        filters.forEach((filter, i) => {
          const button = document.createElement('button');
          button.textContent = filter;
          button.setAttribute('aria-selected', !i); // first filter is default view
          button.setAttribute('role', 'tab');
          button.setAttribute('data-filter', toClassName(filter));
          button.addEventListener('click', filterNews);
          container.append(button);
        });
        block.prepend(container);
      }
      // add show more/less buttons
      if (limit > 8) {
        const container = document.createElement('div');
        container.classList.add('button-container', 'news-pagination');
        const types = ['More', 'Less'];
        types.forEach((type) => {
          const button = document.createElement('button');
          button.textContent = `Show ${type}`;
          button.setAttribute('data-show', type.toLowerCase());
          button.addEventListener('click', paginateNews);
          container.append(button);
        });
        block.append(container);
      }
      makeLinksRelative(block);
      updateExternalLinks(block);
    }
  }, { threshold: 0 });

  observer.observe(block);
}
