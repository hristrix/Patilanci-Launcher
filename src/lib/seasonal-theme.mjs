export const THEMES = Object.freeze({
  original: {
    label: 'Оригинална',
    greeting: '',
    artwork: 'bulgarian-village.png',
    alt: 'Българско планинско село с каменен мост и българско знаме',
  },
  halloween: {
    label: 'Хелоуин',
    greeting: 'Нощ на приключенията',
    artwork: 'seasonal-halloween.png',
    alt: 'Есенно планинско село под пълна луна, светещи тикви и мъглива река',
    description: 'Следвай фенерите. Открий какво се крие в мъглата.',
  },
  christmas: {
    label: 'Коледа',
    greeting: 'Коледна магия в Патиланци',
    artwork: 'seasonal-christmas.png',
    alt: 'Заснежено българско село с празнична елха, топли светлини и северно сияние',
    description: 'Снежни върхове, топли светлини и приключения с приятели.',
  },
  newyear: {
    label: 'Нова година',
    greeting: 'Нова година. Нови приключения.',
    artwork: 'seasonal-newyear.png',
    alt: 'Планинско село в полунощ с часовникова кула, златни светлини и фойерверки',
    description: 'Небето празнува. Следващата история започва с теб.',
  },
});

export const THEME_STORAGE_KEY = 'patilanci.development.theme';

// Use the player's local calendar, including the December/January rollover.
export function seasonalTheme(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 10 && day >= 24) return 'halloween';
  if (month === 12 && day <= 26) return 'christmas';
  if ((month === 12 && day >= 27) || (month === 1 && day <= 2))
    return 'newyear';
  return 'original';
}

export function resolveTheme({
  date = new Date(),
  development = false,
  override,
} = {}) {
  return development && Object.hasOwn(THEMES, override)
    ? override
    : seasonalTheme(date);
}

export function readThemeOverride(storage) {
  try {
    const saved = storage.getItem(THEME_STORAGE_KEY);
    return Object.hasOwn(THEMES, saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
}
