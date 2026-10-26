import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Search, Terminal, Trash2 } from 'lucide-react';
import WindowTitleBar from './WindowTitleBar';
import '../console.css';
import { localizeMessage } from '../../electron/messages.mjs';

const STATUS = {
  idle: 'Изчаква Minecraft',
  preparing: 'Подготвя Minecraft',
  running: 'Играта работи',
  stopping: 'Спира Minecraft',
  stopped: 'Minecraft е затворен',
  failed: 'Неуспешно стартиране',
};

export default function GameConsole({
  embedded = false,
  api = window.patilanciConsole,
}) {
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
    if (!embedded) document.title = 'Логове на Патиланци';
    let active = true,
      timer;
    async function update() {
      try {
        if (!api) return;
        const next = await (embedded
          ? api.consoleSnapshot(cursor.current.lastId)
          : api.snapshot(cursor.current.lastId));
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
                  ...next.entries.map((entry) =>
                    entry.source === 'launcher'
                      ? { ...entry, message: localizeMessage(entry.message) }
                      : entry,
                  ),
                ].slice(-next.limit),
              },
        );
      } catch {
        if (active) setNotice('Логовеът временно не е достъпен.');
      }
      if (active) timer = setTimeout(update, 350);
    }
    update();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, embedded]);
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
              `[${new Date(entry.time).toLocaleTimeString('bg-BG')}] [${entry.source === 'minecraft' ? 'Игра' : 'Приложение'}] ${entry.message}`,
          )
          .join('\n'),
      );
      setCopied(true);
      setNotice('Показаните съобщения са копирани.');
    } catch {
      setNotice(
        'Копирането не успя. Опитай да избереш текста и да го копираш ръчно.',
      );
    }
  }
  async function clear() {
    try {
      await (embedded ? api.clearConsole() : api.clear());
      setSnapshot((previous) => ({ ...previous, entries: [] }));
      setNotice('Логовеът е изчистен.');
    } catch {
      setNotice('Логовеът не може да бъде изчистен.');
    }
  }
  function saveLog() {
    const file = new Blob(
      [
        visible
          .map(
            (entry) =>
              `[${new Date(entry.time).toLocaleTimeString('bg-BG')}] [${entry.source === 'minecraft' ? 'Игра' : 'Приложение'}] ${entry.message}`,
          )
          .join('\n'),
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patilanci-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      {!embedded && (
        <WindowTitleBar
          api={api}
          pageLabel="Логове на Minecraft"
          closeLabel="Затвори Логовеа"
        />
      )}
      <section className={`game-console ${embedded ? 'is-embedded' : ''}`}>
        <header className="console-heading">
          <div>
            {embedded ? (
              <div className="page-breadcrumb">
                Приложение <span>/</span>
                <strong>Логове</strong>
              </div>
            ) : (
              <span className="overline">ПАТИЛАНЦИ</span>
            )}
            <div className="console-title-line">
              <h1>
                {!embedded && <Terminal size={27} />}{' '}
                {embedded ? 'Логове' : 'Логове на Minecraft'}
              </h1>
              <span className={`console-status is-${snapshot.status}`}>
                <span className="status-dot" />
                {STATUS[snapshot.status]}
              </span>
            </div>
            <p>
              {embedded
                ? 'Следи съобщенията на играта в реално време.'
                : 'Съобщения от играта в реално време.'}
            </p>
          </div>
          <div className="console-actions">
            <button
              className="outline-button"
              onClick={copy}
              disabled={!visible.length}
              aria-label="Копирай показаните съобщения"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}Копирай
            </button>
            <button
              className="outline-button"
              onClick={saveLog}
              disabled={!visible.length}
              aria-label="Запази Логовеа във файл"
            >
              <Download size={18} />
              Запази Логовеа
            </button>
            <button
              className="icon-button"
              onClick={clear}
              disabled={!snapshot.entries.length}
              aria-label="Изчисти Логовеа"
              title="Изчисти Логовеа"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>
        <div className="console-surface">
          <div className="console-toolbar">
            <label className="console-search">
              <Search size={16} />
              <input
                aria-label="Търси в Логовеа"
                placeholder="Търси в Логовеа…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Вид на съобщенията"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="all">Всички съобщения</option>
              <option value="warnings">Предупреждения и грешки</option>
              <option value="errors">Само грешки</option>
            </select>
            <label className="console-follow">
              <input
                type="checkbox"
                role="switch"
                checked={follow}
                onChange={(event) => setFollow(event.target.checked)}
              />
              Автоматично превъртане
            </label>
          </div>
          <div
            className="console-output"
            ref={output}
            tabIndex="0"
            aria-label="Съобщения от Minecraft"
          >
            {visible.length ? (
              visible.map((entry) => (
                <div
                  className={`console-line is-${entry.level}`}
                  key={entry.id}
                >
                  <time dateTime={new Date(entry.time).toISOString()}>
                    [
                    {new Date(entry.time).toLocaleTimeString('en-GB', {
                      hour12: false,
                    })}
                    ]
                  </time>
                  <span className="console-source">
                    {{ info: 'Информация', warn: 'Внимание', error: 'Грешка' }[
                      entry.level
                    ] || 'Съобщение'}
                  </span>
                  <span className="console-message">{entry.message}</span>
                </div>
              ))
            ) : (
              <div className="console-empty">
                <Terminal size={38} />
                <strong>
                  {snapshot.entries.length
                    ? 'Няма съвпадащи съобщения'
                    : 'Готово за следващото приключение'}
                </strong>
                <span>
                  {snapshot.entries.length
                    ? 'Потърси друга дума или избери друг вид съобщения.'
                    : 'Съобщенията от Minecraft ще се появят тук, когато натиснеш „Играй“.'}
                </span>
              </div>
            )}
          </div>
          <footer className="console-footer">
            <span>
              {visible.length} / {snapshot.entries.length} реда · Пазят се
              последните {snapshot.limit.toLocaleString()} реда
            </span>
            <span className="console-notice" role="status">
              {notice ||
                (embedded
                  ? 'Логовеът се обновява в реално време.'
                  : 'Затварянето на този прозорец спира Minecraft.')}
            </span>
          </footer>
        </div>
      </section>
    </>
  );
}
