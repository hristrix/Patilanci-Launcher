import React, { useState } from 'react';
import { CheckCircle2, FolderOpen, RotateCcw } from 'lucide-react';
import './java-settings.css';
import { localizeMessage } from '../../electron/messages.mjs';

export default function JavaSettings({ api, paths = {}, onChange, disabled }) {
  const [error, setError] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState(21);
  function update(major, value) {
    setError('');
    onChange({ ...paths, [major]: value });
  }
  async function browse(major) {
    if (!api) return;
    setError('');
    setBrowsing(true);
    try {
      const executable = await api.browseJava(major);
      if (executable) {
        update(major, executable);
        setSelectedMajor(major);
      }
    } catch (error) {
      setError(localizeMessage(error));
    } finally {
      setBrowsing(false);
    }
  }
  return (
    <div className="settings-group java-settings">
      <h4>Java</h4>
      <div className="java-management">
        <label htmlFor="java-version">Управление на Java</label>
        <select
          id="java-version"
          value={selectedMajor}
          disabled={disabled || browsing}
          onChange={(event) => setSelectedMajor(Number(event.target.value))}
        >
          {[8, 17, 21, 25].map((major) => (
            <option key={major} value={major}>
              Java {major} ·{' '}
              {paths[major]?.trim() ? 'Избран файл' : 'Автоматичен избор'}
            </option>
          ))}
        </select>
      </div>
      <p className="java-recommendation">
        <CheckCircle2 size={20} />
        {paths[selectedMajor]?.trim()
          ? 'Избран от теб файл за Java'
          : 'Препоръчително'}
      </p>
      <p>Подходящата Java версия се изтегля автоматично.</p>
      <div className="java-version-list">
        {[8, 17, 21, 25].map((major) => (
          <div
            className="java-version-row"
            key={major}
            hidden={major !== selectedMajor}
          >
            <label htmlFor={`java-path-${major}`}>
              Файл за Java {major} (по избор)
            </label>
            <input
              id={`java-path-${major}`}
              value={paths[major] || ''}
              placeholder="Автоматичен избор"
              onChange={(event) => update(major, event.target.value)}
              disabled={disabled || browsing || !paths[major]?.trim()}
              spellCheck={false}
              title={
                paths[major] ||
                'Приложението избира Java автоматично. С „Преглед“ можеш да посочиш свой файл java.exe.'
              }
            />
            <button
              type="button"
              className="java-path-action"
              aria-label={`Върни Java ${major} към автоматичен избор`}
              title="Върни автоматичния избор"
              disabled={disabled || browsing || !paths[major]?.trim()}
              onClick={() => update(major, '')}
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className="java-path-action"
              aria-label={`Избери файл за Java ${major}`}
              title="Избери файла java.exe"
              disabled={disabled || browsing || !api}
              onClick={() => browse(major)}
            >
              <FolderOpen size={17} />
              <span>Преглед</span>
            </button>
          </div>
        ))}
      </div>
      <small>
        Преглед избира java.exe. Стрелката връща автоматичната Java.
      </small>
      {error && (
        <p className="java-path-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
