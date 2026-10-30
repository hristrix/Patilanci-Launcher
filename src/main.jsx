import { createRoot } from 'react-dom/client';
import App from './App';
import GameConsole from './components/GameConsole';
import SeasonalTheme from './components/SeasonalTheme';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import './style.css';
import './responsive.css';
import './home.css';
import './pack.css';
import './controls.css';
import './player.css';
import './window.css';
import './branded-home.css';
import './atmosphere.css';
import './splash.css';
import './reference-ui.css';
import './components/mods.css';
import './secondary-ui.css';
import './seasonal.css';

createRoot(document.getElementById('root')).render(
  window.location.hash === '#console' ? (
    <GameConsole />
  ) : (
    <SeasonalTheme api={window.launcher}>
      <App api={window.launcher} />
    </SeasonalTheme>
  ),
);
