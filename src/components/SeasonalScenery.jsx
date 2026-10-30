import { useSeasonalTheme } from './SeasonalTheme';

// The environment is painted into each landscape. Only light, snow, and mist move.
export default function SeasonalScenery({ paused }) {
  const { theme } = useSeasonalTheme();
  if (theme === 'original') return null;
  return (
    <div
      className={`seasonal-scenery ${paused ? 'is-paused' : ''}`}
      data-season={theme}
      aria-hidden="true"
    >
      {Array.from({ length: theme === 'christmas' ? 36 : 22 }, (_, index) => (
        <i
          key={index}
          className="seasonal-particle"
          style={{
            '--particle-x': `${(index * 47 + 11) % 100}%`,
            '--particle-y': `${(index * 31 + 7) % 100}%`,
            '--particle-size': `${2 + (index % 3)}px`,
            '--particle-delay': `${-index * 1.7}s`,
            '--particle-duration': `${9 + (index % 7)}s`,
          }}
        />
      ))}
    </div>
  );
}
