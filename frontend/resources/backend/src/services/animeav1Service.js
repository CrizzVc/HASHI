import * as cheerio from 'cheerio';

const BASE_URL = 'https://animeav1.com';
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; HASHI/1.0)',
  Accept: 'text/html,application/xhtml+xml'
};

function toAbsoluteUrl(value) {
  if (!value) return null;
  try {
    return new URL(value, BASE_URL).toString();
  } catch {
    return null;
  }
}

function posterFromThumbnail(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  try {
    const url = new URL(thumbnailUrl);
    if (!url.pathname.includes('/thumbnails/')) return null;
    url.pathname = url.pathname.replace('/thumbnails/', '/covers/');
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchPage(url) {
  const response = await fetch(url, { headers: REQUEST_HEADERS });
  if (!response.ok) throw new Error(`AnimeAV1 respondió con ${response.status}`);
  return response.text();
}

export async function getLatestAnimeAV1() {
  const $ = cheerio.load(await fetchPage(BASE_URL));
  const latest = [];
  const seen = new Set();

  $('.grid.grid-cols-2').first().children().each((_index, element) => {
    const card = $(element);
    const link = card.find('a[href*="/media/"]').first();
    const href = link.attr('href');
    if (!href) return;

    const parts = href.split('/').filter(Boolean);
    const slug = parts.length >= 2 ? parts[1] : '';
    const episode = parts.length >= 3 ? parts[2] : '';
    const title = card.find('header div, h3').first().text().trim()
      || link.text().replace('Ver ', '').trim();
    const episodeImage = toAbsoluteUrl(card.find('img').first().attr('src'));
    const episodeUrl = toAbsoluteUrl(href);

    if (!title || !episodeUrl || seen.has(episodeUrl)) return;
    seen.add(episodeUrl);
    latest.push({
      title,
      episode: episode || card.find('.text-lead, div.text-xs').first().text().trim(),
      posterImage: posterFromThumbnail(episodeImage),
      episodeImage,
      animeUrl: slug ? `${BASE_URL}/media/${slug}` : episodeUrl,
      episodeUrl
    });
  });

  return latest;
}

export async function getAnimeAV1Episodes(animeUrl) {
  const $ = cheerio.load(await fetchPage(animeUrl));
  const episodes = [];
  const seen = new Set();
  $('a[href*="/media/"]').each((_index, element) => {
    const href = $(element).attr('href');
    const parts = (href || '').split('/').filter(Boolean);
    if (parts.length !== 3 || seen.has(href)) return;
    seen.add(href);
    episodes.push({
      episode: parts[2],
      episodeUrl: toAbsoluteUrl(href),
      image: toAbsoluteUrl($(element).find('img').first().attr('src'))
    });
  });
  return episodes.sort((a, b) => Number(a.episode) - Number(b.episode));
}

export async function getAnimeAV1Servers(episodeUrl) {
  const html = await fetchPage(episodeUrl);
  const servers = [];
  const seen = new Set();
  const regex = /{server:"([^"]+)",url:"([^"]+)"}/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[2].replace(/\\/g, '');
    if (!seen.has(url)) {
      seen.add(url);
      servers.push({ name: match[1], url });
    }
  }
  return servers;
}
