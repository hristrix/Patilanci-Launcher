function ServerStatus({ server, refreshing }) {
  const label =
    refreshing || server === null
      ? 'Checking server'
      : server.online
        ? 'Server online'
        : 'Server unreachable';

  return (
    <span
      className={`server-status ${server?.online ? 'is-online' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="status-dot" />
      {label}
    </span>
  );
}

export default function PageHeading({ page, server, refreshing }) {
  return (
    <div className="page-heading">
      <div>
        <span className="overline">
          <span className="gold-square" />
          THE GOOD TIMES START HERE
        </span>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </div>
      <ServerStatus server={server} refreshing={refreshing} />
    </div>
  );
}
