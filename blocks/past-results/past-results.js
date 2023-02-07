import {
  fetchPlaceholders,
  fetchGraphQL,
} from '../../scripts/scripts.js';

async function fetchResults(year) {
  const placeholders = await fetchPlaceholders();
  const id = `${placeholders.tourCode.toUpperCase()}${placeholders.currentYear}${placeholders.tournamentId}`;
  return fetchGraphQL(`query PastResults($id: ID!, $year: Int) {
    tournamentPastResults(id: $id, year: $year) {
      additionalDataHeaders
      availableSeasons {
        year
        displaySeason
      }
      id
      players {
        id
        additionalData
        position
        total
        parRelativeScore
        rounds {
            score
            parRelativeScore
        }
        player {
          abbreviations
          amateur
          country
          countryFlag
          displayName
          id
        }
      }
      rounds 
      winner {
          countryFlag
          countryName
          firstName
          id
          lastName
          firstName
          points
          totalScore
          totalStrokes
      }
    }
  }`, {
    id,
    year,
  });
}

function updateResults(block, resultData) {
  const tableWrapper = block.querySelector('.table-wrapper');
  tableWrapper.innerHTML = '';

  const headers = [
    {
      text: 'Player',
      class: 'cell',
      rowspan: 2,
    },
    {
      text: 'Pos',
      class: 'cell sortable',
      rowspan: 2,
      sortOn: 'data-sort-pos',
    },
    {
      text: 'Rounds',
      class: 'cell hidden-small',
      colspan: 4,
    },
    {
      text: 'To Par',
      class: 'cell sortable to-par',
      rowspan: 2,
      sortOn: 'data-sort-to-par-roundNum',
    },
    {
      text: 'Total Score',
      class: 'cell sortable total-score',
      rowspan: 2,
      sortOn: 'data-sort-total-score-roundNum',
    }];
  resultData.additionalDataHeaders.forEach((additionalData) => {
    headers.push({
      text: additionalData,
      class: 'cell',
      rowspan: 2,
    });
  });

  const table = document.createElement('table');
  table.setAttribute('cellpadding', 0);
  table.setAttribute('cellspacing', 0);
  table.setAttribute('data-display-score', 'total-score');
  table.setAttribute('data-display-rounds', resultData.rounds.length);
  const thead = document.createElement('thead');
  const theadRow = document.createElement('tr');
  headers.forEach((header) => {
    const th = document.createElement('th');
    th.className = header.class;
    th.innerText = header.text;
    if (header.rowspan) th.rowSpan = header.rowspan;
    if (header.colspan) th.colSpan = header.colspan;
    if (header.sortOn) th.dataset.sortOn = header.sortOn;
    theadRow.append(th);
  });
  thead.append(theadRow);

  const theadRoundsRow = document.createElement('tr');
  const roundSelect = block.querySelector('#pastResultsRoundSelector');
  roundSelect.innerHTML = '';
  resultData.rounds.forEach((round, idx) => {
    // round select options
    const option = document.createElement('option');
    option.value = idx + 1;
    option.innerText = round;
    if (idx === (resultData.rounds.length - 1)) {
      option.selected = 'selected';
    }
    roundSelect.append(option);

    // round headers
    const th = document.createElement('th');
    th.innerText = round;
    th.className = 'sortable hidden-small';
    th.dataset.sortOn = `data-sort-round-${idx + 1}-scoreType`;
    theadRoundsRow.append(th);
  });
  thead.append(theadRoundsRow);
  table.append(thead);
  const tbody = document.createElement('tbody');
  tbody.className = 'table-data';
  resultData.players.forEach((playerScore) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td class="cell"><a class="player-link" data-player-id="${playerScore.player.id}" href="#">${playerScore.player.displayName}</a></td>
      <td><span class="position" data-sort-pos="${playerScore.position.replace('T', '')}">${playerScore.position}</span></td>
    `;

    let totalScore = 0;
    const totalScoreByRound = [];
    let toParTotal = 0;
    const toParTotalByRound = [];
    playerScore.rounds.forEach((round, idx) => {
      const td = document.createElement('td');
      td.className = `hidden-small round round-${idx + 1}`;
      td.setAttribute(`data-sort-round-${idx + 1}-total-score`, round.score);
      td.setAttribute(`data-sort-round-${idx + 1}-to-par`, round.parRelativeScore);
      td.innerHTML = `<span class="to-par">${round.parRelativeScore}</span><span class="total-score">${round.score}</span>`;
      tr.append(td);

      const scoreAsNumber = Number(round.score);
      const toParAsNumber = Number(round.parRelativeScore);
      totalScore += Number.isNaN(scoreAsNumber) ? 0 : scoreAsNumber;
      toParTotal += Number.isNaN(toParAsNumber) ? 0 : toParAsNumber;
      totalScoreByRound.push(totalScore);
      toParTotalByRound.push(toParTotal);
    });

    if (totalScoreByRound.length < resultData.rounds.length) {
      // fewer rounds played for player, likely  cut...
      for (let i = totalScoreByRound.length; i < resultData.rounds.length; i += 1) {
        const td = document.createElement('td');
        td.className = `hidden-small round round-${i + 1}`;
        td.setAttribute(`data-sort-round-${i + 1}-total-score`, 'n/a');
        td.setAttribute(`data-sort-round-${i + 1}-to-par`, 'n/a');
        td.innerHTML = '<span class="to-par">--</span><span class="total-score">--</span>';
        tr.append(td);

        totalScoreByRound.push('--');
        toParTotalByRound.push('--');
      }
    }

    const toParTd = document.createElement('td');
    toParTd.className = 'to-par';
    toParTotalByRound.forEach((roundScore, idx) => {
      const span = document.createElement('span');
      span.className = `to-par-value round-${idx + 1}`;
      span.setAttribute(`data-sort-to-par-${idx + 1}`, roundScore);
      let roundScoreToShow = roundScore > 0 ? `+${roundScore}` : roundScore;
      roundScoreToShow = roundScoreToShow === 0 ? 'E' : roundScoreToShow;
      span.innerText = roundScoreToShow;
      toParTd.append(span);
    });
    tr.append(toParTd);

    const totalScoreTd = document.createElement('td');
    totalScoreTd.className = 'total-score';
    totalScoreByRound.forEach((roundScore, idx) => {
      const span = document.createElement('span');
      span.className = `total-score-value round round-${idx + 1}`;
      span.setAttribute(`data-sort-total-score-${idx + 1}`, roundScore);
      span.innerText = roundScore;
      totalScoreTd.append(span);
    });
    tr.append(totalScoreTd);

    playerScore.additionalData.forEach((datum) => {
      const td = document.createElement('td');
      td.className = 'additional-data';
      td.innerText = datum;
      tr.append(td);
    });

    tbody.append(tr);
  });

  const allPlayerIds = [...tbody.querySelectorAll('a[data-player-id]')].map((a) => a.dataset.playerId);
  fetchGraphQL(`query GetPlayers($ids: [ID!]!) {
    players(ids: $ids) {
      id
      bioLink
    }
  }`, {
    ids: allPlayerIds,
  }).then(async (playersResp) => {
    // do this update on a promise so it doesn't delay finishing the block loading
    if (playersResp.ok) {
      const playersJson = await playersResp.json();
      playersJson.data.players.forEach((playerJson) => {
        const { bioLink, id } = playerJson;
        tbody.querySelector(`a[data-player-id="${id}"]`).href = bioLink;
      });
    }
  });

  table.append(tbody);

  // init sorting
  table.querySelectorAll('.sortable').forEach((th) => {
    const data = table.querySelector('.table-data');
    const rows = [...data.querySelectorAll('tr')];
    th.addEventListener('click', () => {
      th.classList.add('arrow');
      if (th.classList.contains('down')) {
        th.classList.remove('down');
        th.classList.add('up');
      } else if (th.classList.contains('up')) {
        th.classList.remove('up');
        th.classList.add('down');
      } else {
        th.classList.add('down');
      }
      // clear existing sorts
      table.querySelectorAll('.arrow').forEach((arrowed) => {
        if (arrowed !== th) arrowed.classList.remove('arrow', 'up', 'down');
      });
      const selectRound = table.dataset.displayRounds;
      const selectedScoreType = table.dataset.displayScore;
      let { sortOn } = th.dataset;
      sortOn = sortOn.replace('scoreType', selectedScoreType);
      sortOn = sortOn.replace('roundNum', selectRound);
      const sortDir = th.classList.contains('down') ? '1' : -1;
      rows.sort((rowA, rowB) => {
        const elA = rowA.querySelector(`[${sortOn}]`);
        const elB = rowB.querySelector(`[${sortOn}]`);
        const valA = elA ? elA.getAttribute(sortOn) : 100000;
        const valB = elB ? elB.getAttribute(sortOn) : 100000;

        return (valA - valB) * sortDir;
      });
      data.innerHTML = '';
      rows.forEach((row) => data.append(row));
    });
  });
  tableWrapper.append(table);
}

export default async function decorate(block) {
  block.innerHTML = '';
  const resp = await fetchResults();
  if (resp.ok) {
    const data = await resp.json();
    if (data && data.data && data.data.tournamentPastResults) {
      const controls = document.createElement('div');
      controls.classList.add('controls', 'past-results-container');
      controls.innerHTML = `
      <div class="controls-left">
        <div class="controls-item">
          <span class="selects-item years">
            <select name="year" id="pastResultsYearSelector"></select>
          </span>
          <span class="selects-item rounds">
            <select name="rounds" id="pastResultsRoundSelector"></select>
          </span>
        </div>
        <div class="controls-item">
          <div class="switch">
            <input class="switch-input" id="pastResultsSwitch" type="checkbox" checked="">
            <label class="switch-title-off" for="pastResultsSwitch">To Par</label>
            <label class="switch-button" for="pastResultsSwitch"></label>
            <label class="switch-title-on" for="pastResultsSwitch">Total Score</label>
          </div>
        </div>
      </div>`;
      block.append(controls);

      // score switch
      block.querySelector('.switch-input').addEventListener('change', (e) => {
        const table = block.querySelector('table');
        if (e.target.checked) {
          table.setAttribute('data-display-score', 'total-score');
        } else {
          table.setAttribute('data-display-score', 'to-par');
        }
      });

      block.querySelector('#pastResultsRoundSelector').addEventListener('change', (e) => {
        const table = block.querySelector('table');
        table.setAttribute('data-display-rounds', e.target.value);
      });

      const yearSelect = block.querySelector('#pastResultsYearSelector');
      data.data.tournamentPastResults.availableSeasons.forEach((season, idx) => {
        const option = document.createElement('option');
        option.value = season.year;
        option.innerText = season.year;
        if (idx === 0) {
          option.selected = 'selected';
        }
        yearSelect.append(option);
      });
      yearSelect.addEventListener('change', async () => {
        const { value } = yearSelect;
        const updateResp = await fetchResults(value);
        if (updateResp.ok) {
          const updateData = await updateResp.json();
          if (updateData && updateData.data && updateData.data.tournamentPastResults) {
            updateResults(block, updateData.data.tournamentPastResults);
          }
        }
      });

      const tableWrapper = document.createElement('div');
      tableWrapper.classList.add('table-wrapper');
      block.append(tableWrapper);
      updateResults(block, data.data.tournamentPastResults);
    }
  }
}
