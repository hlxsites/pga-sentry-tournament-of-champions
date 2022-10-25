import {
  buildBlock,
  decorateBlock,
  decorateButtons,
  loadBlock,
} from '../../scripts/scripts.js';

function transformBackgroundImage(section) {
  const picture = section.querySelector('picture');
  picture.classList.add('player-feature-background');
  return picture;
}

function wrapCredits(section) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('player-feature-credits');
  const credits = section.innerHTML.split('|').map((credit) => credit.trim());
  credits.forEach((credit, i) => {
    const p = document.createElement('p');
    p.innerHTML = credit;
    wrapper.append(p);
    if (i > 0) wrapper.classList.add('player-feature-credits-multi');
  });
  return wrapper;
}

function buildVideoContent(section) {
  if (section) {
    const id = section.textContent.trim();
    if (id) return buildBlock('video', id);
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  if (link) {
    const source = link.getAttribute('href');
    if (source && link.textContent.endsWith(source)) {
      const resp = await fetch(`${source}.plain.html`);
      if (resp.ok) {
        const html = await resp.text();
        const feature = document.createElement('div');
        feature.innerHTML = html;
        block.innerHTML = `<div>${feature.querySelector('div').outerHTML}</div>`;
        const video = block.querySelector('.embed, .video');
        decorateButtons(block);
        if (video) {
          decorateBlock(video);
          await loadBlock(video);
        }
      }
    }
  }

  const sections = ['background', 'status', 'name', 'credits'];
  [...block.firstElementChild.firstElementChild.children].forEach((child, i) => {
    if (sections[i]) child.classList.add(`player-feature-${sections[i]}`);
  });

  const background = block.querySelector('.player-feature-background');
  const status = block.querySelector('.player-feature-status');
  const name = block.querySelector('.player-feature-name');
  const credits = block.querySelector('.player-feature-credits');
  const hasBio = credits.nextElementSibling.className !== 'button-container';
  const button = block.querySelector('.button-container');
  let video = block.querySelector('.embed, .video');

  // transform content
  const backgroundImg = transformBackgroundImage(background);
  const wrappedCredits = wrapCredits(credits);
  if (!video) video = buildVideoContent(block.querySelector('p > em'));

  // order content
  const content = [status, name, wrappedCredits];
  if (hasBio) content.push(credits.nextElementSibling);
  if (button) content.push(button);
  if (video) content.push(video);

  // wrap content
  const wrapper = document.createElement('div');
  wrapper.classList.add('player-feature-content');
  content.forEach((c) => wrapper.append(c));

  block.innerHTML = '';
  block.append(wrapper);
  if (video) {
    decorateBlock(video);
    await loadBlock(video);
  }
  block.parentNode.prepend(backgroundImg);
}
