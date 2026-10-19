import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Search, Terminal, Trash2 } from 'lucide-react';
import WindowTitleBar from './WindowTitleBar';
import '../console.css';

const api = window.patilanciConsole;
const STATUS = {
  idle: 'Waiting for Minecraft',
  preparing: 'Preparing Minecraft',
  running: 'Minecraft is running',
  stopping: 'Stopping Minecraft',
  stopped: 'Minecraft closed',
  failed: 'Launch failed',
};

export default function GameConsole() {
  const [snapshot, setSnapshot] = useState({
    entries: [],
    status: 'idle',
    limit: 2000,
  });
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [follow, setFollow] = useState(true);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const output = useRef(null);
  const cursor = useRef({ lastId: 0, generation: null });
  useEffect(() => {
    document.title = 'Patilanci Console';
    let active = true,
      timer;
    async function update() {
      try {
        const next = await api.snapshot(cursor.current.lastId);
        if (!active) return;
        const reset = next.generation !== cursor.current.generation;
        cursor.current = { lastId: next.lastId, generation: next.generation };
        setSnapshot((previous) =>
          !reset && !next.entries.length && next.status === previous.status
            ? previous
            : {
                ...next,
                entries: [
                  ...(reset ? [] : previous.entries),
                  ...next.entries,
                ].slice(-next.limit),
              },
        );
      } catch {
        if (active) setNotice('Console output is temporarily unavailable.');
      }
      if (active) timer = setTimeout(update, 350);
    }
    update();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    if (follow && output.current)
      output.current.scrollTop = output.current.scrollHeight;
  }, [snapshot.entries, follow, query, level]);
  const visible = snapshot.entries.filter(
    (entry) =>
      (level === 'all' ||
        (level === 'warnings'
          ? entry.level !== 'info'
          : entry.level === 'error')) &&
      entry.message.toLowerCase().includes(query.toLowerCase()),
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        visible
          .map(
            (entry) =>
              `[${new Date(entry.time).toLocaleTimeString()}] [${entry.source}] ${entry.message}`,
          )
          .join('\n'),
      );
      setCopied(true);
      setNotice('Visible output copied.');
    } catch {
      setNotice('Could not copy output. Try selecting the text instead.');
    }
  }
  async function clear() {
    try {
      await api.clear();
      setSnapshot((previous) => ({ ...previous, entries: [] }));
      setNotice('Console cleared.');
    } catch {
      setNotice('Could not clear output.');
    }
  }
  return (
    <>
      <WindowTitleBar
        api={api}
        pageLabel="Minecraft console"
        closeLabel="Close console"
      />
      <main className="game-console">
        <header className="console-heading">
          <div>
            <span className="overline">PATILANCI SMP</span>
            <h1>
              <Terminal size={27} /> Minecraft console
            </h1>
            <p>Your adventure, line by line.</p>
          </div>
          <span className={`console-status is-${snapshot.status}`}>
            <span className="status-dot" />
            {STATUS[snapshot.status]}
          </span>
        </header>
        <div className="console-toolbar">
          <label className="console-search">
            <Search size={16} />
            <input
              aria-label="Search console output"
              placeholder="Search output…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter console output"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="all">All output</option>
            <option value="warnings">Warnings & errors</option>
            <option value="errors">Errors only</option>
          </select>
          <button
            className="outline-button"
            onClick={copy}
            disabled={!visible.length}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}Copy
          </button>
          <button
            className="outline-button"
            onClick={clear}
            disabled={!snapshot.entries.length}
          >
            <Trash2 size={15} />
            Clear
          </button>
        </div>
        <div
          className="console-output"
          ref={output}
          tabIndex="0"
          aria-label="Minecraft console output"
        >
          {visible.length ? (
            visible.map((entry) => (
              <div className={`console-line is-${entry.level}`} key={entry.id}>
                <time dateTime={new Date(entry.time).toISOString()}>
                  {new Date(entry.time).toLocaleTimeString()}
                </time>
                <span className="console-source">
                  {entry.source === 'minecraft' ? 'GAME' : 'LAUNCHER'}
                </span>
                <span className="console-message">{entry.message}</span>
              </div>
            ))
          ) : (
            <div className="console-empty">
              <Terminal size={38} />
              <strong>
                {snapshot.entries.length
                  ? 'No matching output'
                  : 'Ready for your next adventure'}
              </strong>
              <span>
                {snapshot.entries.length
                  ? 'Try another search or filter.'
                  : 'Minecraft output will appear here when you press Play.'}
              </span>
            </div>
          )}
        </div>
        <footer className="console-footer">
          <label>
            <input
              type="checkbox"
              checked={follow}
              onChange={(event) => setFollow(event.target.checked)}
            />
            Autoscroll
          </label>
          <span>
            {visible.length} / {snapshot.entries.length} lines · Last{' '}
            {snapshot.limit.toLocaleString()} retained
          </span>
          <span className="console-notice" role="status">
            {notice || 'Closing this window stops Minecraft.'}
          </span>
        </footer>
      </main>
    </>
  );
}
