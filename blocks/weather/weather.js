import {
  toClassName,
  createOptimizedPicture,
  decorateIcons,
  fetchPlaceholders,
  fetchGraphQL,
} from '../../scripts/scripts.js';

function toggleWeather(e) {
  const button = e.target.closest('button');
  const block = button.closest('.block');
  const toggle = button.getAttribute('data-toggle');
  // update button
  const buttons = block.querySelectorAll('.button-container > button');
  buttons.forEach((btn) => btn.setAttribute('aria-selected', false));
  button.setAttribute('aria-selected', true);
  // toggle table view
  const table = block.querySelector('.weather-table-body');
  if (toggle.includes('hourly')) {
    table.classList.remove('weather-table-7-day-forecast');
    table.classList.add('weather-table-hourly');
  } else if (toggle.includes('7-day-forecast')) {
    table.classList.remove('weather-table-hourly');
    table.classList.add('weather-table-7-day-forecast');
  }
}

function buildRow(data) {
  const cell = document.createElement('div');
  cell.innerHTML = data;
  return cell;
}

const windDirections = {
  NORTH: 'N',
  NORTH_EAST: 'NE',
  EAST: 'E',
  SOUTH_EAST: 'SE',
  SOUTH: 'S',
  SOUTH_WEST: 'SW',
  WEST: 'W',
  NORTH_WEST: 'NW',
};

function buildWeather(block, weatherData) {
  block.parentNode.classList.add('forecast-wrapper');
  // setup title
  const location = weatherData.title;
  const title = block.querySelector('h2');
  if (title) {
    title.textContent = `${title.textContent} | ${location}`;
  } else {
    const h2 = document.createElement('h2');
    h2.textContent = location;
    h2.id = toClassName(location);
    block.prepend(h2);
  }
  // add bg image
  const currentWeather = weatherData.hourly[0];
  const weatherCondition = currentWeather.condition.toLowerCase();
  let condition = 'fair';
  if (weatherCondition.includes('cloud')) {
    condition = 'cloudy';
  } else if (weatherCondition.includes('shower') || weatherCondition.includes('rain')) {
    condition = 'rain';
  } else if (weatherCondition.includes('thunder') || weatherCondition.includes('storm')) {
    condition = 'thunderstorm';
  } else if (weatherCondition.includes('sun')) {
    condition = 'sunny';
  } else if (weatherCondition.includes('fog')) {
    condition = 'fog';
  } else if (weatherCondition.includes('snow')) {
    condition = 'snow';
  }

  const bgImg = createOptimizedPicture(`/blocks/weather/weather-${condition}.png`);

  bgImg.className = 'weather-background';
  block.prepend(bgImg);
  const weatherGrid = document.createElement('div');
  weatherGrid.className = 'weather-grid';
  // temperature
  const temperature = document.createElement('div');
  temperature.className = 'weather-temp';
  // eslint-disable-next-line no-underscore-dangle
  const temp = currentWeather.temperature.__typename === 'StandardWeatherTemp' ? currentWeather.temperature.tempF : currentWeather.temperature.maxTempF;
  temperature.innerHTML = `
  <p class="weather-data"><span>${temp.replace('°F', '')}</span></p>
  <p class="weather-desc">Temperature</p>`;
  // conditions
  const conditions = document.createElement('div');
  conditions.className = 'weather-conditions';
  // TODO figure out where to get this image from in new system
  conditions.innerHTML = `
  <p class="weather-data"><span class="icon icon-weather-${currentWeather.condition.toLowerCase().replaceAll('_', '-')}"></span></p>
  <p class="weather-desc">Conditions</p>`;
  // wind speed
  const wind = document.createElement('div');
  wind.className = 'weather-wind';
  wind.innerHTML = `
  <p class="weather-data"><span class="icon icon-wind"></span>${currentWeather.windSpeedMPH}<span>mp/h<br />${windDirections[currentWeather.windDirection] ? windDirections[currentWeather.windDirection] : currentWeather.windDirection}</span></p>
  <p class="weather-desc">Wind Speed</p>`;
  // humidity
  const humidity = document.createElement('div');
  humidity.className = 'weather-humidity';
  humidity.innerHTML = `
   <p class="weather-data"><span class="icon icon-humidity"></span><span>${currentWeather.humidity.replace('%', '')}</span></p>
   <p class="weather-desc">Humidity</p>`;
  weatherGrid.append(temperature, conditions, wind, humidity);
  decorateIcons(weatherGrid);
  block.append(weatherGrid);
}

function buildForecast(block, weatherData) {
  // setup toggle
  const toggle = ['Hourly', '7 Day Forecast'];
  const container = document.createElement('div');
  container.classList.add('button-container', 'weather-toggle');
  toggle.forEach((t, i) => {
    const button = document.createElement('button');
    button.textContent = t;
    button.setAttribute('aria-selected', !i); // first toggle is default view
    button.setAttribute('role', 'tab');
    button.setAttribute('data-toggle', toClassName(t));
    button.addEventListener('click', toggleWeather);
    container.append(button);
  });
  block.prepend(container);
  // build table
  const table = document.createElement('div');
  table.classList.add('weather-table');
  // setup table titles column
  const titleCol = document.createElement('div');
  titleCol.classList.add('weather-table-titles');
  const rowNames = [' ', 'Wind', 'Conditions', 'Temp', 'Humidity', 'Chance of Rain'];
  rowNames.forEach((name) => titleCol.append(buildRow(name)));
  table.append(titleCol);
  // setup table body
  const body = document.createElement('div');
  body.classList.add('weather-table-body', 'weather-table-hourly');
  // populate hourly forecast
  weatherData.hourly.forEach((hour) => {
    const col = document.createElement('div');
    col.className = 'weather-col-hourly';
    // eslint-disable-next-line no-underscore-dangle
    const temp = hour.temperature.__typename === 'StandardWeatherTemp' ? hour.temperature.tempF : hour.temperature.maxTempF;
    col.append(
      buildRow(hour.title),
      buildRow(`${hour.windSpeedMPH} mp/h ${windDirections[hour.windDirection] ? windDirections[hour.windDirection] : hour.windDirection}`),
      buildRow(`<span class="icon icon-weather-${hour.condition.toLowerCase().replaceAll('_', '-')}"></span>`),
      buildRow(`<span class="weather-temp">${temp.replace('°F', '')}</span>`),
      buildRow(`<span class="weather-humidity">${hour.humidity.replace('%', '')}</span>`),
      buildRow(`<span class="weather-chance-of-rain">${hour.precipitation.replace('%', '')}</span>`),
    );
    decorateIcons(col);
    body.append(col);
  });
  // populate 7 day forecast
  weatherData.daily.forEach((day) => {
    const col = document.createElement('div');
    col.className = 'weather-col-7-day-forecast';
    // eslint-disable-next-line no-underscore-dangle
    const temp = day.temperature.__typename === 'StandardWeatherTemp' ? day.temperature.tempF : day.temperature.maxTempF;
    col.append(
      buildRow(day.title),
      buildRow(`${day.windSpeedMPH} mp/h ${windDirections[day.windDirection] ? windDirections[day.windDirection] : day.windDirection}`),
      buildRow(`<span class="icon icon-weather-${day.condition.toLowerCase().replaceAll('_', '-')}"></span>`),
      buildRow(`<span class="weather-temp">${temp.replace('°F', '')}</span>`),
      buildRow(`<span class="weather-humidity">${day.humidity.replace('%', '')}</span>`),
      buildRow(`<span class="weather-chance-of-rain">${day.precipitation.replace('%', '')}</span>`),
    );
    decorateIcons(col);
    body.append(col);
  });
  table.append(body);
  block.append(table);
}

export default async function decorate(block) {
  try {
    const blockClasses = [...block.classList];
    const placeholders = await fetchPlaceholders();
    const id = `${placeholders.tourCode.toUpperCase()}${placeholders.currentYear}${placeholders.tournamentId}`;
    const weatherResp = await fetchGraphQL(`query Weather($tournamentId: ID!) {
    weather(tournamentId: $tournamentId) {
      title
      daily {
        condition
        humidity
        precipitation
        temperature {
          ... on StandardWeatherTemp {
            __typename
            tempF
          }
          ... on RangeWeatherTemp {
            __typename
            maxTempF
            minTempF
          }
        }
        title
        windDirection
        windSpeedMPH
      }
      hourly {
        condition
        humidity
        precipitation
        temperature {
          ... on StandardWeatherTemp {
            __typename
            tempF
          }
          ... on RangeWeatherTemp {
            __typename
            maxTempF
            minTempF
          }
        }
        title
        windDirection
        windSpeedMPH
      }
    }
  }
  `, {
      tournamentId: id,
    });
    if (weatherResp.ok) {
      const weatherData = await weatherResp.json();
      if (weatherData && weatherData.data && weatherData.data.weather) {
        if (blockClasses.includes('forecast')) {
          buildForecast(block, weatherData.data.weather);
        } else {
          buildWeather(block, weatherData.data.weather);
        }

        return;
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Could not load weather', e);
  }

  // remove block if fail to load data
  block.parentNode.remove();
}
