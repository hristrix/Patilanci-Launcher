import React, { useState } from 'react';
import { FolderOpen, RotateCcw } from 'lucide-react';
import './java-settings.css';

export default function JavaSettings({ api, paths = {}, onChange, disabled }) {
  const [error, setError] = useState('');
  const [browsing, setBrowsing] = useState(false);
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
      if (executable) update(major, executable);
    } catch (error) {
      setError(
        error.message.replace(
          /^Error invoking remote method '[^']+': (?:Error: )?/,
          '',
        ),
      );
    } finally {
      setBrowsing(false);
    }
  }
  return (
    <div className="settings-group java-settings">
      <h4>Java versions</h4>
      <p>
        The correct Java version is downloaded automatically for your modpack.
        Use Browse to choose your own executable, or Reset to let Patilanci
        manage it.
      </p>
      <div className="java-version-list">
        {[8, 17, 21, 25].map((major) => (
          <div className="java-version-row" key={major}>
            <label htmlFor={`java-path-${major}`}>Java {major}</label>
            <input
              id={`java-path-${major}`}
              value={paths[major] || ''}
              placeholder="Automatic · managed by Patilanci"
              onChange={(event) => update(major, event.target.value)}
              disabled={disabled || browsing || !paths[major]?.trim()}
              spellCheck={false}
              title={
                paths[major] ||
                'Managed by Patilanci. Use Browse to choose your own Java executable.'
              }
            />
            <button
              type="button"
              className="java-path-action"
              aria-label={`Reset Java ${major} to automatic`}
              title="Reset to automatic"
              disabled={disabled || browsing || !paths[major]?.trim()}
              onClick={() => update(major, '')}
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className="java-path-action"
              aria-label={`Browse for Java ${major}`}
              title="Choose java.exe"
              disabled={disabled || browsing || !api}
              onClick={() => browse(major)}
            >
              <FolderOpen size={17} />
            </button>
          </div>
        ))}
      </div>
      {error && (
        <p className="java-path-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
