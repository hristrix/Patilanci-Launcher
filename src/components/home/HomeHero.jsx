import { useEffect, useState } from 'react';
import { ArrowUpRight, Layers, Pause, Play } from 'lucide-react';
import WorldScene from '../WorldScene';

export default function HomeHero({ installed, onNavigate, children }) {
  const [motionPaused, setMotionPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <section
      className="home-world-banner home-hero"
      aria-label="Patilanci Adventures"
    >
      <WorldScene paused={motionPaused || hidden} />
      <div className="home-banner-shade" />
      <button
        className="scene-motion-toggle"
        aria-label={
          motionPaused ? 'Resume scenery animation' : 'Pause scenery animation'
        }
        aria-pressed={motionPaused}
        title={
          motionPaused ? 'Resume scenery animation' : 'Pause scenery animation'
        }
        onClick={() => setMotionPaused((paused) => !paused)}
      >
        {motionPaused ? <Play size={14} /> : <Pause size={14} />}
      </button>
      <div className="home-banner-copy">
        <span className="home-banner-eyebrow">PATILANCI ADVENTURES</span>
        <h2>Minecraft {installed?.minecraft || '1.21.10'}</h2>
        <span className="home-modpack-pill">
          <Layers size={12} /> Custom modpack
        </span>
        <p className="home-pack-description">
          A world worth coming back to. Explore new places, build something
          extraordinary, and make your next adventure a shared one on Patilanci.
        </p>
        <button
          className="home-pack-link"
          onClick={() => onNavigate('modpack')}
        >
          Explore the modpack <ArrowUpRight size={13} />
        </button>
      </div>
      {children}
    </section>
  );
}
