import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { SERVER_ADDRESS } from '../../config';

export default function PageFooter({ onRefresh, refreshing, onError }) {
  const [copied, setCopied] = useState(false);
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError('Could not copy the server address.');
    }
  }

  return (
    <footer className="page-footer">
      <button className="server-address" onClick={copyAddress}>
        <span className="status-dot" />
        {copied ? 'Address copied' : SERVER_ADDRESS}
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <div className="launcher-legal">
        <span>© 2026 MADEARC LTD. All rights reserved.</span>
      </div>
      <button
        className="refresh-link"
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
      >
        <RefreshCw size={12} />
        {refreshing ? 'Refreshing…' : 'Refresh status'}
      </button>
    </footer>
  );
}
