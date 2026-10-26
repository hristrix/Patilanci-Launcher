import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { SERVER_ADDRESS } from '../../config';

export default function PageFooter({
  onRefresh,
  refreshing,
  onError,
  onOpenAuthor,
}) {
  const [copied, setCopied] = useState(false);
  async function openAuthor(event) {
    if (!onOpenAuthor) return;
    event.preventDefault();
    try {
      await onOpenAuthor();
    } catch {
      onError('Страницата hristrix.com не може да бъде отворена.');
    }
  }
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError('Адресът на сървъра не може да бъде копиран.');
    }
  }

  return (
    <footer className="page-footer">
      <button className="server-address" onClick={copyAddress}>
        <span className="status-dot" />
        {copied ? 'Адресът е копиран' : SERVER_ADDRESS}
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <div className="launcher-legal">
        <a
          href="https://hristrix.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={openAuthor}
          title="Отвори страницата на Hristrix"
        >
          © 2026 · Създадено от Hristrix
        </a>
      </div>
      <button
        className="refresh-link"
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
      >
        <RefreshCw size={12} />
        {refreshing ? 'Обновяване…' : 'Провери връзката'}
      </button>
    </footer>
  );
}
