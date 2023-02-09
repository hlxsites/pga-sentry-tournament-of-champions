import { fetchPlaceholders, fetchCors } from '../../scripts/scripts.js';

function findStatPercent(id, stats, divisor) {
  const stat = stats.find((s) => s.id === id);
  if (stat) {
    const percent = parseInt(stat.eV2, 10) / divisor;
    return Math.round(percent * 100);
  }
  return 0;
}

function buildStatRow(stat, value) {
  const row = document.createElement('tr');
  row.innerHTML = `<td>
      <div class="course-hole-bar" style="width: ${value}%"></div>
    </td>
    <td>${value}%</td>
    <td>${stat}</td>`;
  return row;
}

async function loadStats(block) {
  const placeholders = await fetchPlaceholders();
  const code = placeholders.tourCode;
  const id = placeholders.tournamentId;
  const resp = await fetchCors(`https://statdata.pgatour.com/${code}/${id}/coursestat.json`);
  const json = await resp.json();
  if (json && json.courses && json.courses[0].holes) {
    const holes = block.querySelectorAll('.course-hole');
    const allStats = json.courses[0].holes;
    holes.forEach((hole, i) => {
      const stats = allStats[i];
      const par = hole.querySelector('.course-hole-par');
      if (par && stats.par) par.textContent = `Par ${stats.par},`;
      const yards = hole.querySelector('.course-hole-yards');
      if (yards && stats.yards) yards.textContent = `${stats.yards} Yards`;
      const title = hole.querySelector('.course-hole-stats h3');
      if (title) title.textContent = `${json.year || ''} Statistics`.trim();
      const avgEl = hole.querySelector('.course-hole-avg');
      const avg = stats.stats.find((stat) => stat.id === '43108').eV2;
      if (avgEl && avg) avgEl.innerHTML = `<span>${avg}</span> Scoring Avg`;
      const table = hole.querySelector('.course-hole-chart tbody');
      if (table) {
        const holeStats = stats.stats.filter((stat) => stat.id !== '43108');
        const statsDivisor = holeStats.reduce((a, b) => {
          // eslint-disable-next-line no-param-reassign
          if (a.eV2) a = a.eV2;
          return parseInt(a, 10) + parseInt(b.eV2, 10);
        });
        const tableStats = [
          { stat: 'Eagle', value: findStatPercent('43106', holeStats, statsDivisor) },
          { stat: 'Birdie', value: findStatPercent('43107', holeStats, statsDivisor) },
          { stat: 'Par', value: findStatPercent('43523', holeStats, statsDivisor) },
          { stat: 'Bogey', value: findStatPercent('41184', holeStats, statsDivisor) },
          { stat: '2+ Bogey', value: findStatPercent('43520', holeStats, statsDivisor) },
        ];
        tableStats.forEach((s) => table.append(buildStatRow(s.stat, s.value)));
      }
    });
  }
}

export default async function decorate(block) {
  block.parentElement.style.visibility = 'hidden';
  const hasStats = block.className.includes('stats');
  const buttons = document.createElement('div');
  buttons.className = 'course-buttons';
  [...block.children].forEach((row, i) => {
    if (!i) row.querySelector('img').setAttribute('loading', 'eager');
    row.className = `course-hole course-hole-${i + 1}`;
    const classes = ['image', 'text'];
    classes.forEach((c, j) => {
      if (row.children[j]) row.children[j].classList.add(`course-hole-${c}`);
    });
    const text = row.querySelector('.course-hole-text');
    if (text) {
      const credits = document.createElement('div');
      credits.className = 'course-hole-credits';
      const creditsText = text.lastElementChild;
      if (creditsText && creditsText.nodeName !== 'H2' && !creditsText.querySelector('img')) {
        credits.append(creditsText);
      } else {
        const fallback = document.createElement('p');
        fallback.innerHTML = '&nbsp;';
        credits.append(fallback);
      }
      const data = document.createElement('div');
      data.className = 'course-hole-data';
      [...text.children].forEach((child) => data.append(child));
      const title = data.querySelector('h2');
      title.className = 'course-hole-title';
      const subtitle = document.createElement('p');
      subtitle.className = 'course-hole-subtitle';
      subtitle.innerHTML = `<span class="course-hole-par">&nbsp;</span> 
        <span class="course-hole-yards">&nbsp;</span>`;
      title.after(subtitle);
      const overhead = data.querySelector('picture > img');
      if (overhead) overhead.parentElement.parentElement.className = 'course-hole-overhead';
      text.append(data, credits);
      // prebuild stats in stats variant
      if (hasStats) {
        const stats = document.createElement('div');
        stats.className = 'course-hole-stats';
        stats.innerHTML = `<h3>&nbsp;</h3>
          <div class="course-hole-avg">
            <p></p>
          </div>
          <table class="course-hole-chart"><tbody></tbody></table>`;
        text.append(stats);
      }
    }
    // add button
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
  if (buttons.hasChildNodes()) block.parentElement.prepend(buttons);
  block.parentElement.removeAttribute('style');

  const observer = new IntersectionObserver(async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      // populate stats in stats variant
      if (hasStats) loadStats(block);
    }
  }, { threshold: 0 });

  observer.observe(block);
}
