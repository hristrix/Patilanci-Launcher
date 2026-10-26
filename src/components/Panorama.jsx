import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';

export default function Panorama({ controls = false }) {
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
        src="./artwork/bulgarian-village.png"
        alt="Българско планинско село с каменен мост и българско знаме"
        draggable="false"
      />
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
