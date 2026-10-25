import { useEffect, useState } from 'react';

export default function useInstanceStorage(api, installed, busy, running) {
  const [storage, setStorage] = useState(null);
  useEffect(() => {
    if (!api?.storage || !installed || busy || running) return;
    let active = true;
    api
      .storage()
      .then((value) => {
        if (active && value.status !== 'busy') setStorage(value);
      })
      .catch(() => {
        if (active) setStorage({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [api, installed?.fileId, busy, running]);

  async function refreshStorage() {
    setStorage(null);
    try {
      setStorage(await api.storage(true));
    } catch {
      setStorage({ status: 'error' });
    }
  }

  return { storage, refreshStorage };
}
