import {
  makeLinksRelative,
  readBlockConfig,
  updateExternalLinks,
  fetchGraphQL,
  fetchPlaceholders,
} from '../../scripts/scripts.js';

async function getArticles(limit, placeholders) {
  try {
    const resp = await fetchGraphQL(`query GetNewsArticles($tour: TourCode, $franchise: String, $franchises: [String!], $playerId: ID, $playerIds: [ID!], $limit: Int, $offset: Int, $tournamentNum: String) {
      newsArticles(tour: $tour, franchise: $franchise, franchises: $franchises, playerId: $playerId, playerIds: $playerIds, limit: $limit, offset: $offset, tournamentNum: $tournamentNum) {
          articles {
              id
              franchise
              franchiseDisplayName
              articleImage
              headline
              publishDate
              teaserContent
              teaserHeadline
              updateDate
              url
          }
      }
  }`, {
      tournamentNum: placeholders.tournamentId,
      limit,
    });
    if (resp.ok) {
      const json = await resp.json();
      if (json.data && json.data.newsArticles && json.data.newsArticles.articles) {
        const articles = json.data.newsArticles.articles.map((article) => {
          const articleUrl = new URL(article.url);
          articleUrl.searchParams.delete('webview');
          return {
            url: articleUrl.toString(),
            type: 'article',
            image: article.articleImage,
            title: article.teaserHeadline,
            date: article.updateDate,
            franchise: article.franchise,
            franchiseDisplayName: article.franchiseDisplayName,
          };
        });
        return articles;
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Could not load news', err);
  }

  // return an empty array if fail, so that local news can still be displayed
  return [];
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
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
      const placeholders = await fetchPlaceholders();
      const articles = await getArticles(limit, placeholders);
      articles.forEach((story, i) => {
        const li = document.createElement('li');
        li.classList.add('related-stories-story');
        const a = document.createElement('a');
        a.href = story.url;
        a.innerHTML = `
            <div class="related-stories-story-image">
              <picture><img src="${story.image}" alt="${story.title}" /></picture>
            </div>
            <div class="related-stories-story-body">
              ${story.franchise ? `<p>${story.franchiseDisplayName}</p>` : ''}
              <a href="${story.url}">${story.title}</a>
            </div>
          `;
        li.append(a);
        [...ul.children][i].replaceWith(li);
      });

      makeLinksRelative(block);
      updateExternalLinks(block);
    }
  }, { threshold: 0 });

  observer.observe(block);
}
