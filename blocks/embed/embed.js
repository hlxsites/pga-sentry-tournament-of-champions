import { loadScript } from '../../scripts/scripts.js';

function buildFormEmbed(url) {
  return `<div class="embed-form-wrapper">
    <iframe src='${url}' allow="encrypted-media" allowfullscreen></iframe>
  </div>`;
}

function buildYoutubeEmbed(url) {
  const video = new URL(url).pathname.replaceAll('/', '');
  return `<div class="embed-youtube-wrapper">
    <iframe
    width="560"
    height="315"
    src="https://www.youtube.com/embed/${video}"
    title="YouTube video player"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>
  </div>`;
}

// <iframe width="560" height="315" src="https://www.youtube.com/embed/w59rZSCRwnw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

function buildTwitterEmbed(url) {
  loadScript('https://platform.twitter.com/widgets.js');
  return `<blockquote class="twitter-tweet embed-twitter-wrapper"><a href="${url}"></a></blockquote>`;
}

function buildInstagramEmbed(url) {
  const endingSlash = url.pathname.endsWith('/') ? '' : '/';
  const location = window.location.href.endsWith('.html') ? window.location.href : `${window.location.href}.html`;
  const src = `${url.origin}${url.pathname}${endingSlash}embed/?cr=1&amp;v=13&amp;wp=1316&amp;rd=${location}`;
  return `<div class="embed-instagram-wrapper">
    <iframe src="${src}" allowtransparency="true" allowfullscreen="true" frameborder="0" loading="lazy">
    </iframe>
  </div>`;
}

function buildFacebookEmbed(url) {
  return `<div class="embed-facebook-wrapper">
    <iframe
      src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560"
      width="560"
      height="315"
      style="border:none;overflow:hidden"
      scrolling="no"
      frameborder="0"
      allowfullscreen="true"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      allowFullScreen="true">
    </iframe>
  </div>`;
}

function buildSpotifyEmbed(url) {
  const playlist = new URL(url).pathname.split('/').pop();
  return `<div class="embed-spotify-wrapper">
    <iframe
      src="https://open.spotify.com/embed?uri=spotify%3Aplaylist%3A${(playlist)}"
      height="380"
      frameborder="0"
      style="border-radius: 12px;"
      allowtransparency="true"
      allow="encrypted-media">
      </iframe>
  </div>`;
}

function buildDefaultEmbed(url) {
  return `<div class="embed-iframe-wrapper">
    <iframe src='${url}' allow="encrypted-media" allowfullscreen></iframe>
  </div>`;
}

function loadEmbed(block) {
  const a = block.querySelector('a');
  if (a) {
    const url = new URL(a.href);
    const { hostname } = url;

    if (hostname.includes('pages08')) {
      a.outerHTML = buildFormEmbed(url);
    } else if (hostname.includes('youtu')) {
      a.outerHTML = buildYoutubeEmbed(url);
    } else if (hostname.includes('twitter')) {
      a.outerHTML = buildTwitterEmbed(url);
    } else if (hostname.includes('instagram')) {
      a.outerHTML = buildInstagramEmbed(url);
    } else if (hostname.includes('facebook')) {
      a.outerHTML = buildFacebookEmbed(url);
    } else if (hostname.includes('spotify')) {
      a.outerHTML = buildSpotifyEmbed(url);
    } else {
      a.outerHTML = buildDefaultEmbed(url);
    }
  }
}

export default function decorate(block) {
  const observer = new IntersectionObserver(async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      loadEmbed(block);
    }
  }, { threshold: 0 });

  observer.observe(block);
}
