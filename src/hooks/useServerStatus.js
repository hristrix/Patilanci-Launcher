import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 30000;

export default function useServerStatus(api) {
  const [server, setServer] = useState(null);
  const [serverRefreshing, setServerRefreshing] = useState(false);
  const serverRequest = useRef(null);
  // A refresh button and the polling timer share the same pending request.
  // Background polls stay silent so the refresh indicator only reflects user actions.
  const request = useCallback(
    (showProgress) => {
      if (!api) return Promise.resolve();
      if (serverRequest.current) return serverRequest.current;
      if (showProgress) setServerRefreshing(true);
      serverRequest.current = Promise.resolve()
        .then(() => api.status())
        .then(setServer)
        .catch(() => setServer({ online: false, players: [] }))
        .finally(() => {
          serverRequest.current = null;
          setServerRefreshing(false);
        });
      return serverRequest.current;
    },
    [api],
  );
  const refreshServer = useCallback(() => request(true), [request]);

  useEffect(() => {
    request(false);
    // Skip polling while the window is hidden and catch up when it returns.
    const poll = () => {
      if (!document.hidden) request(false);
    };
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [request]);
  return { server, serverRefreshing, refreshServer };
}
