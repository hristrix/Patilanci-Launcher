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
    `${(bytes / BYTES_PER_GB).toFixed(1).replace(/\.0$/, '')} ГБ`;

  return (
    <div className="settings-group memory-settings">
      <h3>Памет</h3>
      <div className="memory-allocation">
        <label htmlFor="memory">Оперативна памет</label>
        <select
          aria-label="Памет за играта"
          value={allocation}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {Array.from({ length: 31 }, (_, i) => i + 2).map((gb) => (
            <option key={gb} value={gb}>
              {gb} ГБ
            </option>
          ))}
        </select>
      </div>
      <input
        id="memory"
        type="range"
        min="2"
        max="32"
        step="1"
        value={allocation}
        style={{ '--memory-fill': `${((allocation - 2) / 30) * 100}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby="memory-guidance memory-assessment"
      />
      <div className="memory-scale" aria-hidden="true">
        <span>2 ГБ</span>
        <span>12 ГБ</span>
        <span>22 ГБ</span>
        <span>32 ГБ</span>
      </div>
      <div className="memory-system">
        <Cpu size={17} />
        <div>
          <span>
            {snapshot && !loadError
              ? `${formatBytes(snapshot.totalBytes)} общо · ${formatBytes(snapshot.availableBytes)} свободни в момента`
              : loadError
                ? 'Паметта не може да бъде проверена.'
                : 'Проверяваме паметта на компютъра…'}
          </span>
          <small>Обновява се на всеки 10 секунди.</small>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Провери паметта отново"
          title="Провери паметта отново"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <details className="memory-details" open={warning}>
        <summary>Препоръки за паметта</summary>
        <small id="memory-guidance" className="memory-guidance">
          Пакет с добавкиът обикновено изисква 4–6 ГБ. Повече памет невинаги
          означава по-плавна игра.
        </small>
        <div
          id="memory-assessment"
          className={`memory-assessment is-${assessment.severity}`}
          data-memory-severity={assessment.severity}
          role={warning ? 'alert' : 'status'}
          aria-live="polite"
        >
          {assessment.severity !== 'unknown' && (
            <>
              {warning ? (
                <AlertTriangle size={19} />
              ) : (
                <CheckCircle2 size={19} />
              )}
              <div>
                <strong>{assessment.title}</strong>
                <p>{assessment.message}</p>
                {assessment.recommendedGb !== null && (
                  <span className="memory-recommendation">
                    Препоръчително в момента: {assessment.recommendedGb} ГБ
                    {allocation !== assessment.recommendedGb && (
                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => onChange(assessment.recommendedGb)}
                      >
                        Използвай {assessment.recommendedGb} ГБ
                      </button>
                    )}
                  </span>
                )}
                {assessment.recommendedGb === null && (
                  <p>
                    В момента няма достатъчно свободна памет за 4 ГБ. Затвори
                    други приложения и провери отново.
                  </p>
                )}
              </div>
            </>
          )}
          {assessment.severity === 'unknown' && (
            <p>
              {loadError
                ? 'Паметта не може да бъде проверена. Опитай отново с бутона за обновяване.'
                : 'Препоръката ще се появи след проверката на паметта.'}
            </p>
          )}
        </div>
        <small className="memory-estimate-note">
          Това е приблизителна препоръка. Можеш да запазиш и друга стойност.
        </small>
      </details>
    </div>
  );
}
