import { fetchPlaceholders } from '../../scripts/scripts.js';

function calculateLocalOffset() {
  const date = new Date();
  const multiplier = (date.getTimezoneOffset() > 0) ? -1 : 1;
  const offset = Math.abs(date.getTimezoneOffset());
  const hours = Math.floor(offset / 60);
  const minutes = (offset % 60) / 60;
  return (hours + minutes) * multiplier;
}

function updateToggleTimes(eventOffset) {
  const offset = calculateLocalOffset() - eventOffset;
  if (offset !== 0) { // only update if offset between event and local time
    const offsetHours = Math.floor(offset);
    const offsetMinutes = (offset % 1) * 60;
    const times = document.querySelectorAll('.tee-times .tee-times-time');
    times.forEach((time) => {
      const defaultHour = parseInt(time.getAttribute('data-hours'), 10);
      const defaultMinute = parseInt(time.getAttribute('data-minutes'), 10);
      const teeHour = time.querySelector('.tee-times-hour');
      const teeMinute = time.querySelector('.tee-times-minute');
      const teeSuffix = time.querySelector('.tee-times-suffix');
      let newHour = defaultHour + offsetHours;
      let newMinute = defaultMinute + offsetMinutes;
      if (offset < 0) { // subtracting time
        if (newMinute < 0) {
          newMinute = 60 - Math.abs(newMinute);
          newHour -= 1;
        }
        if (newHour <= 0) {
          newHour = 24 - Math.abs(newHour);
        }
      } else if (offset > 0) { // adding time
        if (newMinute >= 60) {
          newMinute -= 60;
          newHour += 1;
        }
        if (newHour > 24) {
          newHour -= 24;
        }
      }
      teeHour.textContent = newHour > 12 ? newHour - 12 : newHour;
      teeMinute.textContent = newMinute.toString().padStart(2, '0');
      teeSuffix.textContent = newHour >= 12 ? 'pm' : 'am';
    });
  }
}

function resetToggleTimes() {
  const times = document.querySelectorAll('.tee-times .tee-times-time');
  times.forEach((time) => {
    const defaultHour = parseInt(time.getAttribute('data-hours'), 10);
    const defaultMinute = time.getAttribute('data-minutes');
    const teeHour = time.querySelector('.tee-times-hour');
    teeHour.textContent = defaultHour > 12 ? defaultHour - 12 : defaultHour;
    const teeMinute = time.querySelector('.tee-times-minute');
    teeMinute.textContent = defaultMinute.padStart(2, '0');
    const teeSuffix = time.querySelector('.tee-times-suffix');
    teeSuffix.textContent = defaultHour >= 12 ? 'pm' : 'am';
  });
}

function getDateObj(dateStr) {
  const date = new Date(dateStr);
  return {
    year: date.getFullYear().toString(),
    month: (date.getMonth() + 1).toString().padStart(2, '0'),
    day: date.getDay().toString(),
    hour: date.getHours().toString().padStart(2, '0'),
    minutes: date.getMinutes.toString(),
  };
}

function getStartEndDates(countdown, spanStr) {
  if (spanStr.includes('-')) {
    const [start, end] = spanStr.split(' ').find((s) => s.includes('-')).replace(',', '').split('-');
    return {
      start: `${parseInt(countdown.year, 10) - 5}${countdown.month}${start.padStart(2, '0')}`,
      end: `${parseInt(countdown.year, 10) + 5}${countdown.month}${end.padStart(2, '0')}`,
    };
  }
  return {
    start: `${parseInt(countdown.year, 10) - 5}${countdown.month}01`,
    end: `${parseInt(countdown.year, 10) + 5}${countdown.month}28`,
  };
}

async function buildClock(block) {
  const placeholders = await fetchPlaceholders();
  const countdown = getDateObj(placeholders.countdown);
  const dates = getStartEndDates(countdown, placeholders.dates);
  // setup clock
  window[`rolex${placeholders.rolexId}`] = [{
    city: placeholders.city,
    local: 'Your Time',
    cdtext: 'Change countdown values',
    startDate: dates.start,
    endDate: dates.end,
    cdyear: countdown.year,
    cdmonth: countdown.month,
    cdday: countdown.day,
    cdhour: countdown.hour,
    cdmin: countdown.minutes,
    offset: placeholders.eventOffset,
    dst: '0',
  }];
  const clock = document.createElement('div');
  clock.className = 'rolex-frame';
  clock.innerHTML = `<iframe
      id="rolexFrame${placeholders.rolexId}"
      data-src="/blocks/promotion/rolex/rolex.frame.html?cities=rolex${placeholders.rolexId}"
      style="width:100%;height:90px;border:0;padding:0;overflow:hidden;scroll:none"
      scrolling="NO"
      frameborder="NO"
      transparency="true"
      src="/blocks/promotion/rolex/rolex.frame.html?cities=rolex${placeholders.rolexId}">
    </iframe>`;
  block.append(clock);
}

async function buildToggle(block) {
  const placeholders = await fetchPlaceholders();
  const toggle = document.createElement('div');
  toggle.className = 'rolex-frame';
  toggle.innerHTML = `<iframe
      id="rolexFrame1txbOyjg"
      class="rolex-frame-medium"
      data-src="/blocks/promotion/rolex/rolex.frameToggle.html?eventcity=${placeholders.city.split(' ').join('+')}&utc=${placeholders.eventOffset}&lang=en"
      style="width:450px;height:100px;border:0;margin:0;padding:0;overflow:hidden;scroll:none"
      scrolling="NO"
      frameborder="NO"
      transparency="true"
      src="/blocks/promotion/rolex/rolex.frameToggle.html?eventcity=${placeholders.city.split(' ').join('+')}&utc=${placeholders.eventOffset}&lang=en">
    </iframe>
    <iframe
      id="rolexFrame1txbOyjg"
      class="rolex-frame-small"
      data-src="/blocks/promotion/rolex/rolex.frameToggleMobile.html?eventcity=${placeholders.city.split(' ').join('+')}&utc=${placeholders.eventOffset}&lang=en"
      style="width:100%;height:58px;border:0px;margin:0px;padding:0px;overflow:hidden;background-color:rgb(0,96,57);"
      scrolling="NO"
      frameborder="NO"
      transparency="true"
      src="/blocks/promotion/rolex/rolex.frameToggleMobile.html?eventcity=${placeholders.city.split(' ').join('+')}&utc=${placeholders.eventOffset}&lang=en">
    </iframe>`;
  block.append(toggle);
  window.addEventListener('message', (e) => {
    if (e.data && e.data.toString().includes('rolex')) {
      const rolexData = JSON.parse(e.data);
      if (rolexData.name === 'rolex-teetime-toggle') {
        const inEventTime = rolexData.value === 'On';
        const headerText = document.querySelector('.tee-times-header > p');
        if (inEventTime) {
          if (headerText) headerText.setAttribute('aria-hidden', false);
          resetToggleTimes();
        } else {
          if (headerText) headerText.setAttribute('aria-hidden', true);
          updateToggleTimes(placeholders.eventOffset);
        }
      }
    }
  });
}

export default function decorate(block) {
  if (block.className.includes('clock')) {
    buildClock(block);
  } else if (block.className.includes('toggle')) {
    buildToggle(block);
  }
}
