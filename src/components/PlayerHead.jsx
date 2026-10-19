import { useEffect, useRef } from 'react';
import usePlayerSkin, { STEVE_SKIN } from './usePlayerSkin';

export default function PlayerHead({ account, api }) {
  const canvas = useRef(null);
  const { texture } = usePlayerSkin(account, api);
  useEffect(() => {
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      const context = canvas.current.getContext('2d');
      const scale = image.naturalWidth / 64;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, 32, 32);
      context.drawImage(
        image,
        8 * scale,
        8 * scale,
        8 * scale,
        8 * scale,
        0,
        0,
        32,
        32,
      );
      context.drawImage(
        image,
        40 * scale,
        8 * scale,
        8 * scale,
        8 * scale,
        0,
        0,
        32,
        32,
      );
    };
    image.onerror = () => {
      if (active && image.src !== STEVE_SKIN.dataUrl)
        image.src = STEVE_SKIN.dataUrl;
    };
    image.src = (texture || STEVE_SKIN).dataUrl;
    return () => {
      active = false;
    };
  }, [texture]);
  return (
    <canvas
      className="player-skin-head"
      ref={canvas}
      width="32"
      height="32"
      role="img"
      aria-label={
        account
          ? `${account.name}'s Minecraft skin head`
          : 'Steve Minecraft skin head'
      }
    />
  );
}
