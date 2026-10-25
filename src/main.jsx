import { createRoot } from 'react-dom/client';
import App from './App';
import GameConsole from './components/GameConsole';
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

createRoot(document.getElementById('root')).render(
  window.location.hash === '#console' ? (
    <GameConsole />
  ) : (
    <App api={window.launcher} />
  ),
);
