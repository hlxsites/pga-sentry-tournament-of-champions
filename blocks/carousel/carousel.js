import {
  toClassName,
  readBlockConfig,
  fetchPlaceholders,
  fetchCors,
} from '../../scripts/scripts.js';

async function insertGallerySlides(block) {
  const damPrefix = 'https://www.pgatour.com';
  const config = readBlockConfig(block);
  const galleryURL = config.source;
  const limit = config.limit || 24;
  block.innerHTML = '';

  const directURL = `${galleryURL}&size=${limit}`;
  try {
    const resp = await fetchCors(directURL);
    if (resp.ok) {
      const json = await resp.json();

      json.items.forEach((photo) => {
        const div = document.createElement('div');
        div.innerHTML = `
        <div class="gallery-image"><picture><img src="${damPrefix}${photo.image}" alt="${photo.description}"/ ></picture></div>
        <div class="gallery-text">
          <p class="gallery-text-title">Photo Gallery${config.title ? `: ${config.title}` : ''}</p>
          ${photo.description ? `<p class="gallery-text-desc">${photo.description}</p>` : ''}
          ${photo.credit ? `<p class="gallery-text-credit">Photo by <strong>${photo.credit}</strong></p>` : ''}
        </div>
      `;
        block.append(div);
      });
    } else {
      // hide block in cases where feed fails
      block.parentNode.remove();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Could not load gallery', err);
    block.parentNode.remove();
  }
}

function findStatPercent(id, stats, divisor) {
  const stat = stats.find((s) => s.id === id);
  if (stat) {
    const percent = parseInt(stat.eV2, 10) / divisor;
    return Math.round(percent * 100);
  }
  return 0;
}

async function insertCourseFeedSlides(block) {
  const damPrefix = 'https://www.pgatour.com/pgatour/courses';
  const cloudinaryPrefix = 'https://pga-tour-res.cloudinary.com/image/upload/f_auto,q_auto';
  const config = readBlockConfig(block);
  const placeholders = await fetchPlaceholders();
  block.innerHTML = '';

  const resp = await fetchCors(`https://statdata.pgatour.com/${placeholders.tourCode}/${placeholders.tournamentId}/coursestat.json`);
  const json = await resp.json();
  if (json && json.courses && json.courses[0].holes) {
    const code = json.tourCode;
    const perm = json.permNum;
    const { courseId } = json.courses[0];
    // eslint-disable-next-line no-restricted-syntax
    for (const hole of json.courses[0].holes) {
      const damSrc = `${damPrefix}/${code}${perm}/${courseId}/holes/hole${hole.holeNum}.jpg`;
      const holeJpg = `${cloudinaryPrefix},w_1290/v1/pgatour/courses/${code}${perm}/${courseId}/holes/hole${hole.holeNum}.jpg`;
      const holePng = `${cloudinaryPrefix},w_150/holes_${config.year || new Date().getFullYear()}_${code}_${perm}_${courseId}_overhead_full_${hole.holeNum}.png`;
      // eslint-disable-next-line no-await-in-loop
      const metaresp = await fetchCors(`${damSrc}/jcr:content/metadata.json`);
      // eslint-disable-next-line no-await-in-loop
      const meta = await metaresp.json();
      const metaDesc = meta['dc:description'];
      const metaCreator = meta['dc:creator'];
      const metaRights = meta['dc:rights'];
      const metaTitle = meta['dc:title'];
      const avg = hole.stats.find((stat) => stat.id === '43108').eV2;
      const stats = hole.stats.filter((stat) => stat.id !== '43108');
      const statsDivisor = stats.reduce((a, b) => {
        // eslint-disable-next-line no-param-reassign
        if (a.eV2) a = a.eV2;
        return parseInt(a, 10) + parseInt(b.eV2, 10);
      });
      const eagle = findStatPercent('43106', stats, statsDivisor);
      const birdie = findStatPercent('43107', stats, statsDivisor);
      const par = findStatPercent('43523', stats, statsDivisor);
      const bogey = findStatPercent('41184', stats, statsDivisor);
      const bogey2 = findStatPercent('43520', stats, statsDivisor);

      const div = document.createElement('div');
      div.innerHTML = `
        <div class="carousel-image">
          <picture>
            <img src="${holeJpg}" alt="${metaTitle}" />
          </picture>
        </div>
        <div class="carousel-text course-text">
          <div class="course-overview">
            <h2>Hole #${hole.holeNum}</h2>
            <div class="course-heading-wrapper">
              <h3>PAR ${hole.par}, ${hole.yards} Yards</h3>
            </div>
            <p class="course-hole">
              <picture>
                <img src="${holePng}" alt="${metaTitle}" />
              </picture>
            </p>
            <p>${metaDesc}</p>
          </div>
            <div class="course-statistics">
              <h3 id="statistics">${config.year || new Date().getFullYear()} Statistics</h3>
              <div class="course-avg">
                  <p>${avg} <strong>SCORING AVG</strong>
                  </p>
              </div>
              <table>
                <tbody>
                  <tr class="course-eagle">
                    <td class="course-stat-graph">
                      <div class="course-stat-bar" style="width: ${eagle}%"></div>
                    </td>
                    <td class="course-stat-percent">${eagle}%</td>
                    <td class="course-stat-title">Eagle</td>
                  </tr>
                  <tr class="course-birdie">
                    <td class="course-stat-graph">
                      <div class="course-stat-bar" style="width: ${birdie}%"></div>
                    </td>
                    <td class="course-stat-percent">${birdie}%</td>
                    <td class="course-stat-title">Birdie</td>
                  </tr>
                  <tr class="course-par">
                    <td class="course-stat-graph">
                      <div class="course-stat-bar" style="width: ${par}%"></div>
                    </td>
                    <td class="course-stat-percent">${par}%</td>
                    <td class="course-stat-title">Par</td>
                  </tr>
                  <tr class="course-bogey">
                    <td class="course-stat-graph">
                        <div class="course-stat-bar" style="width: ${bogey}%"></div>
                    </td>
                    <td class="course-stat-percent">${bogey}%</td>
                    <td class="course-stat-title">Bogey</td>
                  </tr>
                  <tr class="course-2--bogey">
                    <td class="course-stat-graph">
                      <div class="course-stat-bar" style="width: ${bogey2}%"></div>
                    </td>
                    <td class="course-stat-percent">${bogey2}%</td>
                    <td class="course-stat-title">2+ Bogey</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="course-credits">PHOTO BY <strong>${metaCreator.join(', ')}</strong> / ${metaRights}</p>
        </div>`;
      block.append(div);
    }
  }
}

export default async function decorate(block) {
  const observer = new IntersectionObserver(async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();

      const blockClasses = [...block.classList];
      const buttons = document.createElement('div');
      buttons.className = 'carousel-buttons';
      if (blockClasses.includes('course')) buttons.classList.add('course-buttons');
      /* gallery carousel */
      if (blockClasses.includes('gallery')) {
        buttons.classList.add('gallery-buttons');
        block.closest('.carousel-container').classList.add('gallery-container');
        await insertGallerySlides(block);
      }
      /* course feed carousel */
      if (blockClasses.includes('course-feed')) {
        block.classList.add('course');
        buttons.classList.add('course-buttons');
        block.closest('.carousel-container').classList.add('course-container');
        await insertCourseFeedSlides(block);
      }

      [...block.children].forEach((row, i) => {
        const classes = ['image', 'text'];
        classes.forEach((e, j) => {
          if (row.children[j]) row.children[j].classList.add(`carousel-${e}`);
        });
        const carouselText = row.querySelector('.carousel-text');
        if (carouselText) {
          const secondaryBtn = carouselText.querySelector('.secondary');
          // pull first secondary button out of button container
          if (secondaryBtn) {
            secondaryBtn.classList.add('read-more');
            const btnContainer = secondaryBtn.closest('.button-container');
            btnContainer.parentElement.insertBefore(secondaryBtn, btnContainer);
            // if secondary is only button, remove button container
            if (!btnContainer.hasChildNodes()) btnContainer.remove();
          }
        }
        /* course carousel */
        if (blockClasses.includes('course')) {
          const text = row.querySelector('.carousel-text');
          text.classList.add('course-text');
          // setup overview (title, img, desc)
          const overview = document.createElement('div');
          overview.classList.add('course-overview');

          const title = text.querySelector('h2'); // hole #
          const headings = text.querySelectorAll('h3'); // hole name and par
          const paragraphs = text.querySelectorAll('p'); // course img, hole description, photo credit

          overview.append(title);
          const headingWrapper = document.createElement('div');
          headingWrapper.classList.add('course-heading-wrapper');
          headings.forEach((h) => {
            headingWrapper.append(h);
          });
          overview.append(headingWrapper);

          paragraphs.forEach((p, idx) => {
            // append all but the last one which is the photo creidt
            if ((idx + 1) < paragraphs.length) {
              overview.append(p);
            }
          });

          const holeImg = overview.querySelector('picture');
          if (holeImg) {
            holeImg.parentNode.classList.add('course-hole');
          } else {
            const courseHolePlaceholder = document.createElement('p');
            courseHolePlaceholder.classList.add('course-hole');
            overview.insertBefore(courseHolePlaceholder, headingWrapper.nextSibling);
          }
          // setup stats
          const statsHeading = text.querySelector('h3');
          if (statsHeading) {
            const statistics = document.createElement('div');
            statistics.classList.add('course-statistics');
            statistics.append(
              statsHeading, // statistics heading
              text.querySelector('h3 + ul'), // statistics list
            );

            const statsTable = document.createElement('table');
            const allStats = statistics.querySelector('ul');
            let stats = [];
            if (allStats) stats = allStats.querySelectorAll('li');
            stats.forEach((s) => {
              const stat = s.querySelector('strong').textContent;
              // setup scoring average ring
              if (stat.toUpperCase() === 'SCORING AVG') {
                const avg = document.createElement('div');
                avg.classList.add('course-avg');
                avg.innerHTML = `<p>${s.innerHTML}</p>`;
                allStats.parentNode.insertBefore(avg, allStats);
                s.remove();
              } else {
                const tableRow = document.createElement('tr');
                tableRow.classList.add(`course-${toClassName(stat)}`);
                const val = parseInt(s.textContent.split(' ')[s.textContent.split(' ').length - 1], 10);

                const bar = document.createElement('td');
                bar.classList.add('course-stat-graph');
                bar.innerHTML = `<div class="course-stat-bar" style="width: ${val}%"></div>`;

                const percent = document.createElement('td');
                percent.classList.add('course-stat-percent');
                percent.innerHTML = `${val}%`;

                const thisStat = document.createElement('td');
                thisStat.classList.add('course-stat-title');
                thisStat.innerHTML = s.querySelector('strong').textContent;

                tableRow.append(bar, percent, thisStat);
                statsTable.append(tableRow);
              }
            });

            if (allStats && statsTable) allStats.replaceWith(statsTable);

            text.prepend(overview, statistics);
          } else {
            text.prepend(overview);
          }

          // setup photo credits
          const credits = text.querySelector('p > em');
          if (credits) credits.parentNode.classList.add('course-credits');
        }
        /* buttons */
        const button = document.createElement('button');
        if (!i) {
          button.classList.add('selected');
          buttons.setAttribute('aria-hidden', true);
        } else {
          buttons.removeAttribute('aria-hidden');
        }
        button.addEventListener('click', () => {
          block.scrollTo({ top: 0, left: row.offsetLeft - row.parentNode.offsetLeft, behavior: 'smooth' });
          [...buttons.children].forEach((r) => r.classList.remove('selected'));
          button.classList.add('selected');
        });
        buttons.append(button);
      });
      block.parentElement.prepend(buttons);
      block.classList.add('appear');
    }
  }, { threshold: 0 });

  observer.observe(block.parentElement);
}
