import { useCallback, useEffect, useRef, useState } from 'react';

export default function useServerStatus(api) {
  const [server, setServer] = useState(null);
  const [serverRefreshing, setServerRefreshing] = useState(false);
  const serverRequest = useRef(null);
  // A refresh button and the polling timer share the same pending request.
  const refreshServer = useCallback(() => {
    if (!api) return Promise.resolve();
    if (serverRequest.current) return serverRequest.current;
    setServerRefreshing(true);
    serverRequest.current = Promise.resolve()
      .then(() => api.status())
      .then(setServer)
      .catch(() => setServer({ online: false, players: [] }))
      .finally(() => {
        serverRequest.current = null;
        setServerRefreshing(false);
      });
    return serverRequest.current;
  }, [api]);

  useEffect(() => {
    refreshServer();
    const timer = setInterval(refreshServer, 30000);
    return () => clearInterval(timer);
  }, [refreshServer]);
  return { server, serverRefreshing, refreshServer };
}
