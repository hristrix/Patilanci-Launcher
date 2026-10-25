import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, Upload, X } from 'lucide-react';
import SkinPreview from './SkinPreview';
import { skinCommand } from '../lib/skin-commands.mjs';
import './skin-manager.css';

export default function SkinManager({
  api,
  account,
  name,
  mode,
  busy,
  running,
  onAction,
  onApplied,
  onClose,
}) {
  const dialog = useRef(null);
  const [tab, setTab] = useState(mode === 'microsoft' ? 'account' : 'server');
  const [selection, setSelection] = useState(null);
  const [variant, setVariant] = useState('classic');
  const [source, setSource] = useState(
    mode === 'offline' ? 'ely.by' : 'mojang',
  );
  const [value, setValue] = useState(name || '');
  const [model, setModel] = useState('classic');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const locked = busy || running;

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  let command = '';
  let commandError = '';
  try {
    command = skinCommand({ source, value, model });
  } catch (error) {
    commandError = error.message;
  }

  function act(callback) {
    setNotice('');
    setError('');
    return onAction(async () => {
      try {
        await callback();
      } catch (error) {
        setError(
          error.message.replace(
            /^Error invoking remote method '[^']+': Error: /,
            '',
          ),
        );
      }
    });
  }

  async function copy(command) {
    setError('');
    try {
      await navigator.clipboard.writeText(command);
      setNotice(
        'Command copied. Join the server, paste it into Minecraft chat, and press Enter.',
      );
    } catch {
      setError(
        'Could not copy. Select the command below and copy it manually.',
      );
    }
  }

  return createPortal(
    <dialog
      className="skin-dialog"
      ref={dialog}
      aria-labelledby="skin-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="skin-dialog-heading">
        <div>
          <span className="overline">MAKE IT YOURS</span>
          <h2 id="skin-title">Set your skin</h2>
          <p>{name}</p>
        </div>
        <button
          className="icon-button"
          aria-label="Close skin settings"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {mode === 'microsoft' && (
        <div className="skin-tabs" role="group" aria-label="Skin destination">
          <button
            className="outline-button"
            aria-pressed={tab === 'account'}
            disabled={busy}
            onClick={() => {
              setTab('account');
              setNotice('');
              setError('');
            }}
          >
            Minecraft account
          </button>
          <button
            className="outline-button"
            aria-pressed={tab === 'server'}
            disabled={busy}
            onClick={() => {
              setTab('server');
              setNotice('');
              setError('');
            }}
          >
            Server skin
          </button>
        </div>
      )}
      {tab === 'account' ? (
        <div className="skin-account-editor">
          <div className="skin-upload-preview">
            <SkinPreview
              account={account}
              api={api}
              previewTexture={
                selection
                  ? {
                      ...selection.texture,
                      model: variant === 'slim' ? 'slim' : 'default',
                    }
                  : null
              }
            />
          </div>
          <div className="skin-upload-controls">
            <h3>Your Minecraft Java skin</h3>
            <p>
              Upload a skin to your premium account. Servers can override it
              with a server skin.
            </p>
            <p>
              Choose a 64 × 64 PNG, or a legacy 64 × 32 Classic skin, up to 1
              MB. Close Minecraft before uploading.
            </p>
            <button
              className="outline-button"
              disabled={locked}
              onClick={() =>
                act(async () => {
                  const next = await api.chooseSkin();
                  if (next) {
                    setSelection(next);
                    if (next.legacy) setVariant('classic');
                  }
                })
              }
            >
              <Upload size={16} />
              Choose PNG
            </button>
            <span className="skin-file-name">
              {selection?.name || 'No new skin selected'}
            </span>
            <label htmlFor="account-skin-model">Skin model</label>
            <select
              id="account-skin-model"
              value={variant}
              disabled={busy || selection?.legacy}
              onChange={(event) => setVariant(event.target.value)}
            >
              <option value="classic">Classic (wide arms)</option>
              <option value="slim">Slim (narrow arms)</option>
            </select>
            <button
              className="play-button"
              disabled={locked || !selection}
              onClick={() =>
                act(async () => {
                  await api.applySkin({ id: selection.id, variant });
                  setSelection(null);
                  setNotice(
                    'Minecraft account skin updated. Launch or rejoin to see it. A server skin may need /skin reset first.',
                  );
                  await onApplied();
                })
              }
            >
              Apply to Minecraft account
            </button>
          </div>
        </div>
      ) : (
        <div className="skin-server-editor">
          <p>
            Set a skin for this server using SkinRestorer. Other players can see
            it when the server applies it.
          </p>
          <p>
            Choose a source, copy the command, then run it in Minecraft chat
            after joining. The launcher preview stays separate from your server
            skin.
          </p>
          <label htmlFor="server-skin-source">Skin source</label>
          <select
            id="server-skin-source"
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setValue('');
              setNotice('');
            }}
          >
            <option value="ely.by">Ely.by username</option>
            <option value="mojang">Minecraft username</option>
            <option value="web">Skin PNG URL</option>
          </select>
          {source === 'ely.by' && (
            <div className="skin-ely-help">
              <p>
                For your own PNG, upload and apply it to your Ely.by account,
                then enter that account's username here. You can use a different
                name from your offline player name.
              </p>
              <button
                className="outline-button"
                disabled={busy}
                onClick={() => act(() => api.skinHelp('ely'))}
              >
                <ExternalLink size={14} />
                Open Ely.by skins
              </button>
            </div>
          )}
          <label htmlFor="server-skin-value">
            {source === 'web'
              ? 'Public HTTPS link to the skin PNG'
              : source === 'mojang'
                ? 'Minecraft username to copy the skin from'
                : 'Ely.by username'}
          </label>
          <input
            id="server-skin-value"
            value={value}
            autoComplete="off"
            spellCheck={false}
            maxLength={source === 'web' ? 256 : 16}
            onChange={(event) => {
              setValue(event.target.value);
              setNotice('');
            }}
            placeholder={
              source === 'web'
                ? 'https://example.com/skin.png'
                : 'Skin owner name'
            }
          />
          {source === 'web' && (
            <>
              <label htmlFor="server-skin-model">Skin model</label>
              <select
                id="server-skin-model"
                value={model}
                onChange={(event) => {
                  setModel(event.target.value);
                  setNotice('');
                }}
              >
                <option value="classic">Classic (wide arms)</option>
                <option value="slim">Slim (narrow arms)</option>
              </select>
            </>
          )}
          <label htmlFor="server-skin-command">
            Command to run in Minecraft
          </label>
          <textarea
            id="server-skin-command"
            readOnly
            rows={2}
            value={command}
            aria-describedby="server-skin-validation"
          />
          <small id="server-skin-validation">
            {commandError ||
              'Ready to copy. Your server must allow this skin source and command.'}
          </small>
          <div className="skin-command-actions">
            <button
              className="play-button"
              disabled={!command}
              onClick={() => copy(command)}
            >
              <Copy size={16} />
              Copy skin command
            </button>
            <button
              className="outline-button"
              onClick={() => copy('/skin reset')}
            >
              Copy reset command
            </button>
            <button
              className="outline-button"
              disabled={busy}
              onClick={() => act(() => api.skinHelp('commands'))}
            >
              <ExternalLink size={14} />
              Command help
            </button>
          </div>
          <p className="skin-server-note">
            These commands work on servers with Lionarius's SkinRestorer and the
            required permissions. A server skin applies on that server; it does
            not change your Minecraft account skin.
          </p>
        </div>
      )}
      {notice && (
        <p className="skin-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="skin-error" role="alert">
          {error}
        </p>
      )}
    </dialog>,
    document.body,
  );
}
