import React, { useEffect, useState } from 'react';
import {
  Box,
  Check,
  FileArchive,
  FolderPlus,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

export default function ModsPage({ api, busy, onAction, onInstall }) {
  const [inventory, setInventory] = useState(null);
  const [tab, setTab] = useState('bundled');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    if (!api) {
      setLoadError('Open the desktop launcher to manage your mods.');
      return;
    }
    api
      .mods()
      .then((result) => {
        if (active) setInventory(result);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    return () => {
      active = false;
    };
  }, [api]);

  function refresh() {
    return onAction(async () => {
      setInventory(await api.mods());
      setLoadError('');
    });
  }

  function addMods() {
    return onAction(async () => {
      const result = await api.addMods();
      setInventory(result);
      if (result.added > 0) {
        setTab('personal');
        setSearch('');
        setNotice(
          `${result.added} ${result.added === 1 ? 'mod added' : 'mods added'} to your instance.`,
        );
      }
    });
  }

  function removeMod(mod) {
    return onAction(async () => {
      setInventory(await api.removeMod(mod.fileName));
      setNotice(
        `${mod.name} was removed. Your original downloaded file is unchanged.`,
      );
    });
  }

  const canModify = inventory?.installed && inventory.canModify && !busy;
  const mods = inventory?.[tab] || [];
  const query = search.toLocaleLowerCase().trim();
  const filtered = mods.filter((mod) =>
    [mod.name, mod.id, mod.fileName].some((value) =>
      value?.toLocaleLowerCase().includes(query),
    ),
  );

  return (
    <section className="panel mods-panel">
      <div className="mods-heading">
        <div>
          <span className="overline">YOUR INSTANCE, YOUR EXTRAS</span>
          <h2>THE MOD COLLECTION.</h2>
          <p>
            {inventory?.installed
              ? `Fabric · Minecraft ${inventory.minecraft} · Pack ${inventory.packVersion}`
              : 'Install Patilanci Adventures to view and customize its mods.'}
          </p>
        </div>
        <button className="play-button" onClick={addMods} disabled={!canModify}>
          <Plus size={18} />
          ADD MODS
        </button>
      </div>
      <div className="mods-policy">
        <ShieldCheck size={19} />
        <div>
          <strong>The Patilanci pack stays together.</strong>
          <p>
            Required mods are locked. You can remove the extras you add through
            this launcher.
          </p>
        </div>
      </div>
      {loadError && (
        <div className="mods-message" role="alert">
          {loadError}
          <button className="outline-button" onClick={refresh} disabled={busy}>
            Retry
          </button>
        </div>
      )}
      {notice && (
        <div className="mods-notice" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
      {inventory && !inventory.installed ? (
        <div className="mods-empty">
          <Box size={38} />
          <h3>Your collection starts with Patilanci.</h3>
          <p>
            Install the official pack first. Then add your own Fabric mods here.
          </p>
          <button className="outline-button" onClick={onInstall}>
            Go to modpack
          </button>
        </div>
      ) : (
        <>
          <div className="mods-toolbar">
            <div
              className="mods-tabs"
              role="tablist"
              aria-label="Mod collections"
            >
              <button
                id="bundled-tab"
                role="tab"
                aria-selected={tab === 'bundled'}
                aria-controls="mods-list"
                onClick={() => setTab('bundled')}
              >
                <LockKeyhole size={14} />
                Patilanci mods<span>{inventory?.bundled.length || 0}</span>
              </button>
              <button
                id="personal-tab"
                role="tab"
                aria-selected={tab === 'personal'}
                aria-controls="mods-list"
                onClick={() => setTab('personal')}
              >
                <FolderPlus size={14} />
                My mods<span>{inventory?.personal.length || 0}</span>
              </button>
            </div>
            <div className="mods-search">
              <Search size={15} />
              <input
                aria-label="Search mods"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a mod…"
              />
            </div>
            <button
              className="icon-button"
              title="Refresh mods"
              onClick={refresh}
              disabled={busy}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div
            id="mods-list"
            role="tabpanel"
            aria-labelledby={tab === 'bundled' ? 'bundled-tab' : 'personal-tab'}
          >
            {!inventory ? (
              <div className="mods-empty" role="status">
                Reading your mod collection…
              </div>
            ) : filtered.length > 0 ? (
              <div className="mod-list">
                {filtered.map((mod) => (
                  <article
                    className="mod-row"
                    key={mod.fileName}
                    data-origin={tab}
                  >
                    <div
                      className={`mod-icon ${tab === 'bundled' ? 'is-protected' : ''}`}
                    >
                      <FileArchive size={22} />
                    </div>
                    <div className="mod-info">
                      <h3>{mod.name}</h3>
                      <span className="mod-file" title={mod.fileName}>
                        {mod.fileName}
                      </span>
                      <small>
                        {mod.id || 'Pack file'}
                        {mod.minecraft ? ` · Minecraft ${mod.minecraft}` : ''}
                      </small>
                    </div>
                    <span className="mod-version" title={mod.version}>
                      {mod.version}
                    </span>
                    {!mod.present && (
                      <span className="mod-missing">File missing</span>
                    )}
                    {tab === 'bundled' ? (
                      <span className="mod-lock">
                        <LockKeyhole size={13} />
                        Required
                      </span>
                    ) : (
                      <button
                        className="remove-mod-button"
                        disabled={!canModify}
                        onClick={() => removeMod(mod)}
                        aria-label={`Remove ${mod.name}`}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mods-empty">
                <FileArchive size={32} />
                <h3>
                  {query
                    ? 'No matching mods.'
                    : tab === 'personal'
                      ? 'Make a little room for more.'
                      : 'No mod files found.'}
                </h3>
                <p>
                  {query
                    ? 'Try a different name or filename.'
                    : tab === 'personal'
                      ? 'Add downloaded Fabric .jar files to personalize your instance.'
                      : 'Refresh the list after installing your modpack.'}
                </p>
                {!query && tab === 'personal' && (
                  <button
                    className="outline-button"
                    onClick={addMods}
                    disabled={!canModify}
                  >
                    <Plus size={15} />
                    Add your first mod
                  </button>
                )}
              </div>
            )}
          </div>
          {inventory?.installed && (
            <div className="mods-footer">
              <span>
                <LockKeyhole size={13} />
                {tab === 'bundled'
                  ? 'Pack files cannot be removed or replaced here.'
                  : 'Your additions are kept when the Patilanci pack updates.'}
              </span>
              <small>
                Choose Fabric mods for Minecraft {inventory.minecraft}. Add any
                required dependencies too.
              </small>
              {!inventory.canModify && (
                <small>
                  Close Minecraft or wait for the current operation, then
                  refresh to edit.
                </small>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
