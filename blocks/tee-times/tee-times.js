import { decorateIcons, fetchGraphQL, fetchPlaceholders } from '../../scripts/scripts.js';

function buildDisplayTime(epoch, courseText, timezone) {
  const h3 = document.createElement('h3');

  const date = new Date(Number(epoch));
  const formatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: timezone });
  const formatted = formatter.format(date);

  h3.innerHTML = `<h3>${courseText}${formatted}</h3>`;

  return h3;
}

export default async function decorate(block) {
  block.textContent = '';

  const placeholders = await fetchPlaceholders();
  const id = `${placeholders.tourCode.toUpperCase()}${placeholders.currentYear}${placeholders.tournamentId}`;
  const teeTimeResp = await fetchGraphQL(`query GetTeeTimes($id: ID!) {
    teeTimes(id: $id) {
      id
      defaultRound
      timezone
      courses {
        id
      }
      rounds {
        roundInt
        groups {
          courseName
          groupNumber
          groupSort
          startTee
          teeTime
          players {
            abbreviations
            amateur
            country
            countryFlag
            firstName
            displayName
            lastName
            id
            shortName
            lineColor
          }
        }
      }
    }
  }`, {
    id,
  });

  if (teeTimeResp.ok) {
    const teeTimeData = await teeTimeResp.json();
    if (teeTimeData && teeTimeData.data && teeTimeData.data.teeTimes) {
      // setup dropdown
      const header = document.createElement('div');
      header.className = 'tee-times-header';
      header.innerHTML = '<p>All tee times are local</p>';
      const dropdown = document.createElement('select');
      dropdown.addEventListener('change', () => {
        const { value } = dropdown;
        const allTimes = document.querySelectorAll('.tee-times-time');
        allTimes.forEach((time) => time.classList.add('filtered'));
        const selectedRounds = [...allTimes].filter((time) => time.getAttribute('data-round') === value);
        selectedRounds.forEach((time) => time.classList.remove('filtered'));
      });
      header.append(dropdown);
      block.prepend(header);
      const {
        defaultRound,
        rounds,
        courses,
        timezone,
      } = teeTimeData.data.teeTimes;
      rounds.forEach((round) => {
        // populate round dropdown
        const option = document.createElement('option');
        option.value = round.roundInt;
        option.textContent = `Round ${round.roundInt}`;
        if (round.roundInt === defaultRound) {
          option.selected = 'selected';
        }
        dropdown.append(option);

        let timeWrapper;
        let prevTime;
        let prevCourse;
        round.groups.forEach((group) => {
          if (prevTime !== group.teeTime || prevCourse !== group.courseName) {
            if (timeWrapper) {
              // append previous time wrapper before we build the next one
              block.append(timeWrapper);
            }

            timeWrapper = document.createElement('div');
            timeWrapper.classList.add('tee-times-time');
            if (round.roundInt !== defaultRound) {
              timeWrapper.classList.add('filtered');
            }

            timeWrapper.setAttribute('data-round', round.roundInt);
            timeWrapper.setAttribute('data-utc', group.teeTime);
            timeWrapper.setAttribute('data-tz', timezone);
            const courseText = courses.length > 1 ? `${group.courseName} - ` : '';
            timeWrapper.setAttribute('data-course-text', courseText);

            timeWrapper.append(buildDisplayTime(group.teeTime, courseText, timezone));
          }
          prevTime = group.teeTime;
          prevCourse = group.courseName;

          const teeWrapper = document.createElement('div');
          teeWrapper.className = 'tee-times-tee';
          teeWrapper.innerHTML = `<h4>Tee #${group.startTee}</h4>`;
          group.players.forEach((player) => {
            const playerWrapper = document.createElement('div');
            playerWrapper.className = 'tee-times-player';
            playerWrapper.innerHTML = `<img
                src="https://pga-tour-res.cloudinary.com/image/upload/f_auto,q_auto,c_fill,r_max,dpr_2.0,g_face:center,h_190,w_190,d_headshots_default.png/headshots_${player.id}.png"
                alt="${player.displayName}"
              />
              <p>
                <span class="icon icon-flag-${player.countryFlag.toLowerCase()}"></span>
                ${player.displayName}
              </p>`;
            teeWrapper.append(playerWrapper);
          });
          timeWrapper.append(teeWrapper);
        });
        block.append(timeWrapper);
      });
      decorateIcons(block);
    }
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.toString().includes('rolex')) {
      const rolexData = JSON.parse(e.data);
      if (rolexData.name === 'rolex-teetime-toggle') {
        const inEventTime = rolexData.value === 'On';
        const headerText = document.querySelector('.tee-times-header > p');
        if (inEventTime) {
          headerText.setAttribute('aria-hidden', false);
          block.querySelectorAll('.tee-times-time').forEach((tt) => {
            const h3 = tt.querySelector('h3');
            h3.remove();
            tt.prepend(buildDisplayTime(tt.dataset.utc, tt.dataset.courseText, tt.dataset.tz));
          });
        } else {
          headerText.setAttribute('aria-hidden', true);
          block.querySelectorAll('.tee-times-time').forEach((tt) => {
            const h3 = tt.querySelector('h3');
            h3.remove();
            tt.prepend(buildDisplayTime(tt.dataset.utc, tt.dataset.courseText));
          });
        }
      }
    }
  });
}
