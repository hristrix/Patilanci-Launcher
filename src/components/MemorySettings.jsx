import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, RefreshCw } from 'lucide-react';
import { assessMemory, BYTES_PER_GB } from '../lib/memory.mjs';

export default function MemorySettings({ api, allocation, onChange }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    async function sample() {
      if (!api) {
        if (active) setLoadError(true);
        return;
      }
      try {
        const result = await api.memoryInfo();
        if (active) {
          setSnapshot(result);
          setLoadError(false);
        }
      } catch {
        if (active) setLoadError(true);
      }
    }
    sample();
    const timer = setInterval(sample, 10000);
    window.addEventListener('focus', sample);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', sample);
    };
  }, [api]);

  async function refresh() {
    if (!api) return;
    setRefreshing(true);
    try {
      setSnapshot(await api.memoryInfo());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setRefreshing(false);
    }
  }

  const assessment = assessMemory(allocation, loadError ? null : snapshot);
  const warning = ['danger', 'warning'].includes(assessment.severity);
  const formatBytes = (bytes) =>
    `${(bytes / BYTES_PER_GB).toFixed(1).replace(/\.0$/, '')} GB`;

  return (
    <div className="settings-group memory-settings">
      <label htmlFor="memory">
        Allocated memory<span>{allocation} GB</span>
      </label>
      <input
        id="memory"
        type="range"
        min="2"
        max="32"
        step="1"
        value={allocation}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby="memory-guidance memory-assessment"
      />
      <small id="memory-guidance">
        The pack usually needs 4–6 GB. More memory does not always mean smoother
        gameplay.
      </small>
      <div className="memory-system">
        <Cpu size={17} />
        <div>
          <span>
            {snapshot && !loadError
              ? `${formatBytes(snapshot.totalBytes)} installed · ${formatBytes(snapshot.availableBytes)} free now`
              : loadError
                ? 'System memory check unavailable'
                : 'Checking your computer’s memory…'}
          </span>
          <small>Refreshes every 10 seconds.</small>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Refresh memory information"
          title="Refresh memory information"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div
        id="memory-assessment"
        className={`memory-assessment is-${assessment.severity}`}
        data-memory-severity={assessment.severity}
        role={warning ? 'alert' : 'status'}
        aria-live="polite"
      >
        {assessment.severity !== 'unknown' && (
          <>
            {warning ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
            <div>
              <strong>{assessment.title}</strong>
              <p>{assessment.message}</p>
              {assessment.recommendedGb !== null && (
                <span className="memory-recommendation">
                  Suggested now: {assessment.recommendedGb} GB
                  {allocation !== assessment.recommendedGb && (
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => onChange(assessment.recommendedGb)}
                    >
                      Use {assessment.recommendedGb} GB
                    </button>
                  )}
                </span>
              )}
              {assessment.recommendedGb === null && (
                <p>
                  No 4 GB starting allocation fits the current safety estimate.
                  Free up memory and check again.
                </p>
              )}
            </div>
          </>
        )}
        {assessment.severity === 'unknown' && (
          <p>
            {loadError
              ? 'Memory usage could not be checked. Refresh to try again.'
              : 'The memory estimate will appear once the system check finishes.'}
          </p>
        )}
      </div>
      <small className="memory-estimate-note">
        This is an estimate, not a performance guarantee. Saving is still
        allowed.
      </small>
    </div>
  );
}
