import {
  makeLinksRelative,
  readBlockConfig,
  toClassName,
  updateExternalLinks,
  fetchPlaceholders,
  fetchGraphQL,
} from '../../scripts/scripts.js';

async function mergeLocalNews(feed, maxItems) {
  const resp = await fetch('/query-index.json');
  const json = await resp.json();
  const newerThan = feed.length === 0 ? -1 : feed[feed.length - 1].updateDate;
  const matched = json.data.filter((item) => {
    if (item.date) {
      const itemDate = new Date(Math.round((item.date - (25567 + 1)) * 86400 * 1000)).valueOf();
      item.updateDate = itemDate;
      item.url = item.path;
      item.type = 'article';
      item.articleImage = item.image;
      item.teaserHeadline = item.title;
      return (itemDate > newerThan);
    }
    return false;
  });
  // check feed items for relative links
  feed.map((item) => {
    const { url } = item;
    const { host, pathname } = new URL(url);
    if (host.includes('pgatour.com')) {
      const splitPath = `/${pathname.split('/').slice(3).join('/')}`;
      const match = matched.find((m) => splitPath.includes(m.path));
      if (match) item.url = splitPath;
    }
    return item;
  });
  const merged = [...feed, ...matched];
  const deduped = [...new Map(merged.map((m) => [
    new URL(m.url, window.location.href).pathname.split('.')[0],
    m,
  ])).values()];
  const sorted = deduped.sort((e1, e2) => e2.updateDate - e1.updateDate);
  return sorted.slice(0, maxItems);
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

async function getNewsArticles(tags, limit, tourcode) {
  try {
    const resp = await fetchGraphQL(`query GetNewsArticles($tour: TourCode, $franchise: String, $franchises: [String!], $playerId: ID, $limit: Int, $offset: Int, $tags: [String!]) {
    newsArticles(tour: $tour, franchise: $franchise, franchises: $franchises, playerId: $playerId, limit: $limit, offset: $offset, tags: $tags) {
        articles {
            id
            articleImage
            publishDate
            teaserHeadline
            updateDate
            url
        }
    }
  }`, {
      limit,
      tags,
      tour: tourcode,
    });
    if (resp.ok) {
      const json = await resp.json();
      if (json.data && json.data.newsArticles && json.data.newsArticles.articles) {
        return json.data.newsArticles.articles;
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Could not load news', err);
  }

  // return an ermpty array if fail, so that local news can still be displayed
  return [];
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const videoPrefix = 'https://pga-tour-res.cloudinary.com/image/upload/c_fill,f_auto,g_face,h_311,q_auto,w_425/v1/';
  const damPrefix = 'https://www.pgatour.com';
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
      const placeholders = await fetchPlaceholders();
      let tags;
      if (config.tags) {
        tags = config.tags.replace(/ /g, '').split(',').join('+');
      } else {
        tags = placeholders.newsTags.split('+');
      }

      const newsFeed = await getNewsArticles(tags, limit, placeholders.tourCode);
      const mergedNews = await mergeLocalNews(newsFeed, config.limit);
      [...pinnedItems, ...mergedNews].forEach((item, idx) => {
        let prefix = '';
        if (item.articleImage.startsWith('brightcove')) prefix = videoPrefix;
        if (item.articleImage.startsWith('/content/dam')) prefix = damPrefix;
        const li = document.createElement('li');
        li.classList.add('news-item', `news-item-${item.type || 'article'}`);
        const video = item.videoId ? '<div class="news-item-play"></div>' : '';
        const a = document.createElement('a');
        a.href = item.url;
        a.innerHTML = `
            <div class="news-item-image"><img loading="${idx < 8 ? 'eager' : 'lazy'}" src="${item.pinned ? '' : prefix}${item.articleImage}"></div>
            <div class="news-item-body"><a href="${item.url}">${item.teaserHeadline}</a></div>
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
