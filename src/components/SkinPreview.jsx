import { useEffect, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';

export default function SkinPreview({ account, api }) {
  const container = useRef(null);
  const canvas = useRef(null);
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    let active = true;
    let viewer;
    let resizeObserver;

    async function initialize() {
      setPhase('loading');
      try {
        if (!api) throw new Error('Desktop preview unavailable.');
        const [texture, { SkinViewer }] = await Promise.all([
          api.skin(
            account.mode === 'offline'
              ? { mode: 'offline', name: account.name }
              : undefined,
          ),
          import('skinview3d'),
        ]);
        if (!active) return;
        if (!texture) {
          setPhase(account.mode === 'offline' ? 'missing' : 'unavailable');
          return;
        }
        const bounds = container.current.getBoundingClientRect();
        viewer = new SkinViewer({
          canvas: canvas.current,
          width: Math.max(bounds.width, 1),
          height: Math.max(bounds.height, 1),
          pixelRatio: Math.min(devicePixelRatio, 2),
          renderPaused: true,
        });
        viewer.controls.enableZoom = false;
        viewer.controls.enablePan = false;
        viewer.controls.enableRotate = false;
        viewer.controls.enabled = false;
        viewer.playerObject.rotation.y = -0.35;
        viewer.autoRotate = false;
        viewer.animation = null;
        await viewer.loadSkin(texture.dataUrl, { model: texture.model });
        if (!active) return;
        viewer.render();
        resizeObserver = new ResizeObserver(([entry]) => {
          viewer.setSize(
            Math.max(entry.contentRect.width, 1),
            Math.max(entry.contentRect.height, 1),
          );
          viewer.render();
        });
        resizeObserver.observe(container.current);
        setPhase('ready');
      } catch {
        if (active) setPhase('unavailable');
        viewer?.dispose();
      }
    }

    initialize();
    return () => {
      active = false;
      resizeObserver?.disconnect();
      viewer?.dispose();
    };
  }, [account.id, api]);

  return (
    <div className="skin-preview" ref={container} data-skin-state={phase}>
      <canvas
        ref={canvas}
        aria-label={`Static 3D Minecraft skin for ${account.name}.`}
        role="img"
      />
      {phase !== 'ready' && (
        <div className="skin-placeholder" role="status">
          {account.mode === 'offline' ? (
            <PlayerAvatar />
          ) : (
            <UserRound size={32} />
          )}
          <span>
            {phase === 'loading'
              ? 'Loading your skin…'
              : phase === 'missing'
                ? 'No public skin found'
                : 'Skin preview unavailable'}
          </span>
        </div>
      )}
    </div>
  );
}
