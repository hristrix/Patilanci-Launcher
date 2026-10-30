import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { Ghost, Snowflake, Sparkles } from 'lucide-react';
import {
  THEMES,
  THEME_STORAGE_KEY,
  readThemeOverride,
  resolveTheme,
} from '../lib/seasonal-theme.mjs';

const ThemeContext = createContext({
  theme: 'original',
  development: false,
  previewStartup: false,
});
export const useSeasonalTheme = () => useContext(ThemeContext);

export default function SeasonalTheme({ api, children }) {
  const [development, setDevelopment] = useState(!api && import.meta.env.DEV);
  const [override, setOverride] = useState('auto');
  const [date, setDate] = useState(() => new Date());
  const [previewStartup, setPreviewStartup] = useState(false);
  const theme = resolveTheme({ date, development, override });

  useEffect(() => {
    let active = true;
    async function initialize() {
      // Electron decides from app.isPackaged, even with a production Vite build (npm start).
      const enabled = api
        ? (await api.environment?.())?.development === true
        : import.meta.env.DEV;
      if (!active) return;
      setDevelopment(enabled);
      if (enabled) setOverride(readThemeOverride(window.localStorage));
    }
    initialize().catch(() => {});
    return () => {
      active = false;
    };
  }, [api]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  useEffect(() => {
    const refresh = () => setDate(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  function selectTheme(value) {
    if (!development) return;
    setOverride(value);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {}
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        development,
        override,
        selectTheme,
        previewStartup: development && previewStartup,
        setPreviewStartup,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemePicker() {
  const {
    development,
    override,
    selectTheme,
    previewStartup,
    setPreviewStartup,
  } = useSeasonalTheme();
  if (!development) return null;
  return (
    <div className="theme-picker">
      <label>
        <span>DEV</span>
        <select
          aria-label="Шаблон за разработка"
          value={override}
          onChange={(event) => selectTheme(event.target.value)}
        >
          <option value="auto">По дата</option>
          {Object.entries(THEMES).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-pressed={previewStartup}
        onClick={() => setPreviewStartup(!previewStartup)}
      >
        {previewStartup ? 'Към launcher' : 'Виж зареждането'}
      </button>
    </div>
  );
}

export function SeasonalGreeting() {
  const { theme } = useSeasonalTheme();
  const Icon = { halloween: Ghost, christmas: Snowflake, newyear: Sparkles }[
    theme
  ];
  return theme === 'original' ? null : (
    <span className="seasonal-greeting">
      <Icon size={15} aria-hidden="true" />
      {THEMES[theme].greeting}
    </span>
  );
}

// A visual fixture only: no retry, install, or launch actions are triggered by previewing.
export const previewStartupState = {
  status: 'checking',
  phase: 'modpack',
  launcher: { status: 'current' },
  account: { status: 'signed-out' },
  steps: {
    launcher: { status: 'done', message: 'Launcher is up to date' },
    account: { status: 'done' },
    modpack: { status: 'active' },
  },
};
export const previewStartupProgress = {
  percent: 57,
  message: 'Подготвяме света…',
};
