import {
  readBlockConfig,
  decorateIcons,
  fetchPlaceholders,
  updateExternalLinks,
  loadScript,
} from '../../scripts/scripts.js';

function generateUserTrackingId(id) {
  return window.pgatour.setTrackingUserId(`id${id}`);
}

function buildCell() {
  return document.createElement('td');
}

function buildRow() {
  return document.createElement('tr');
}

function buildLeaderboardTable() {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = buildRow();
  const cols = [' ', 'POS', 'TP', 'Country', 'Total', 'Thru'];
  cols.forEach((col) => {
    const cell = document.createElement('th');
    if (col !== 'TP') {
      cell.textContent = col;
    } else {
      cell.innerHTML = '<p><span class="icon icon-up"></span><span class="icon icon-down"></span></p>';
    }
    headRow.append(cell);
  });
  head.append(headRow);
  table.append(head);
  const body = document.createElement('tbody');
  return [table, body];
}

function calculateTP(start, current) {
  // eslint-disable-next-line no-param-reassign
  start = parseInt(start.replace('T', ''), 10) || 1;
  // eslint-disable-next-line no-param-reassign
  current = parseInt(current.replace('T', ''), 10);
  const tp = start - current;
  return { tp: Math.abs(tp), posMove: tp > 0 };
}

async function populateLeaderboard(block, config) {
  const placeholders = await fetchPlaceholders();
  // fetch leaderboard content
  const tournament = `${placeholders.tourCode}/${placeholders.tournamentId}`;
  const resp = await fetch(`https://statdata.pgatour.com/${tournament}/leaderboard-top5.json?userTrackingId=${generateUserTrackingId(config.id)}`);
  if (resp.ok) {
    const json = await resp.json();
    if (json.leaderboard && json.leaderboard.players) {
      const { players } = json.leaderboard;
      const [table, body] = buildLeaderboardTable();
      const buttons = document.createElement('div');
      buttons.className = 'button-container';
      const leaderWrapper = document.createElement('div');
      players.forEach((player, i) => {
        const bio = player.player_bio;
        const { tp, posMove } = calculateTP(player.start_position, player.current_position);
        if (!i) { // setup leader info for leaderboard leader
          const leader = document.createElement('div');
          leader.className = 'leaderboard-leader';
          leader.innerHTML = `
          <div class="leaderboard-leader-img">
            <img
              src="https://pga-tour-res.cloudinary.com/image/upload/f_auto,q_auto,c_fill,r_max,dpr_2.0,g_face:center,h_260,w_260,d_headshots_default.png/headshots_${player.player_id}.png"
              alt="${bio.first_name} ${bio.last_name}"
            />
          </div>
          <div class="leaderboard-leader-body">
            <p class="leaderboard-leader-body-title">${bio.first_name} ${bio.last_name}</p>
            <div class="leaderboard-leader-stats">
              <div>
                <span class="icon icon-flag-${bio.country.toLowerCase()}"></span>
              </div>
              <div>
                <p class="leaderboard-leader-stats-title">Total</p>
                <p class="leaderboard-leader-stats-stat">${player.total}</p>
              </div>
              <div>
                <p class="leaderboard-leader-stats-title">Thru</p>
                <p class="leaderboard-leader-stats-stat">${player.thru < 18 ? player.thru : 'F'}</p>
              </div>
            </div>
          </div>`;
          const scorecard = document.createElement('a');
          scorecard.className = 'button primary';
          scorecard.textContent = 'View full scorecard';
          scorecard.href = `https://www.pgatour.com/players/player.${player.player_id}.${bio.first_name}-${bio.last_name}.html/scorecards/${json.leaderboard.tournament_id}`.toLowerCase();
          buttons.append(scorecard);
          if (config['button-link'] && config['button-text']) {
            const secondaryBtn = document.createElement('a');
            secondaryBtn.className = 'button secondary';
            secondaryBtn.textContent = config['button-text'];
            secondaryBtn.href = config['button-link'];
            buttons.append(secondaryBtn);
          }
          decorateIcons(leader);
          leader.append(buttons);
          leaderWrapper.append(leader);
          block.append(leaderWrapper);
        }
        const row = buildRow();
        const favoriteButtonCell = buildCell();
        favoriteButtonCell.className = 'leaderboard-favorite';
        favoriteButtonCell.innerHTML = `<button class="leaderboard-favorite-button" data-tour="${json.leaderboard.tour_code}" data-id="${player.player_id}" data-op="add">
          <span class="icon icon-plus"></span>
        </button>
        <span class="tooltip"><span class="tooltip-op">Add to</span> <br /><strong>Favorite Players</strong></span>`;
        row.append(favoriteButtonCell);
        const favoriteButton = favoriteButtonCell.querySelector('button');
        favoriteButton.addEventListener('click', () => {
          import('../../scripts/delayed.js').then((module) => module.initGigya());
        });
        const playerData = [
          player.current_position,
          `<p>${tp !== 0 ? `<span class="icon icon-${posMove ? 'up' : 'down'}"></span> ${tp}` : '--'}</p>`,
          `<p class="leaderboard-player"><span class="icon icon-flag-${bio.country.toLowerCase()}"></span> ${bio.first_name} ${bio.last_name}</p>`,
          player.total,
          player.thru < 18 ? player.thru : 'F',
        ];
        playerData.forEach((d) => {
          const cell = buildCell();
          cell.innerHTML = d;
          if (typeof d === 'string' && d.includes('flag')) decorateIcons(cell);
          row.append(cell);
        });
        body.append(row);
      });
      /* setup footer */
      const footer = document.createElement('div');
      footer.className = 'leaderboard-footer';
      footer.innerHTML = `<div class="button-container">
        <a href="${config.leaderboard}" class="button primary">View full leaderboard</a>
      </div>`;
      /* setup sponsors */
      const sponsors = document.createElement('div');
      sponsors.className = 'leaderboard-sponsors';
      const configSponsors = Object.keys(config).filter((key) => (
        key.startsWith('sponsor-') // is a sponsor
        && !key.endsWith('-link') // is not a sponsor link
        && config[`${key}-link`])); // but HAS a sponsor link
      configSponsors.forEach((s) => {
        const img = config[s];
        const link = config[`${s}-link`];
        const a = document.createElement('a');
        a.className = 'leaderboard-sponsors-sponsor';
        a.setAttribute('href', link);
        a.innerHTML = `<img src="${img}" alt="${s.replace('sponsor-', '')}"/>`;
        sponsors.append(a);
      });
      footer.prepend(sponsors);
      /* setup table column */
      const tableWrapper = document.createElement('div');
      table.append(body);
      tableWrapper.append(table, footer);
      block.append(tableWrapper);
    }
    updateExternalLinks(block);
  }
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';

  const observer = new IntersectionObserver(async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      loadScript('https://microservice.pgatour.com/js', () => {
        populateLeaderboard(block, config);
      });
    }
  }, { threshold: 0 });

  observer.observe(block);
}
