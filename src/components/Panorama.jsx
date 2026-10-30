import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import SeasonalScenery from './SeasonalScenery';
import { useSeasonalTheme } from './SeasonalTheme';
import { THEMES } from '../lib/seasonal-theme.mjs';

export default function Panorama({ controls = false }) {
  const { theme } = useSeasonalTheme();
  const artwork = THEMES[theme];
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return (
    <>
      <img
        className={`village-panorama ${paused || hidden ? 'is-paused' : ''}`}
        src={`./artwork/${artwork.artwork}`}
        alt={artwork.alt}
        onError={(event) => {
          if (!event.currentTarget.src.endsWith('/bulgarian-village.png'))
            event.currentTarget.src = './artwork/bulgarian-village.png';
        }}
        draggable="false"
      />
      <SeasonalScenery paused={paused || hidden} />
      {controls && (
        <button
          className="scene-motion-toggle"
          aria-label={
            paused
              ? 'Продължи движението на пейзажа'
              : 'Спри движението на пейзажа'
          }
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}
    </>
  );
}
