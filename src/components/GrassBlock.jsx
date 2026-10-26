export default function GrassBlock({ className = '' }) {
  return (
    <svg
      className={`minecraft-block ${className}`}
      viewBox="0 0 48 52"
      aria-hidden="true"
    >
      <path fill="#6aaf39" d="m24 1 23 12-23 12L1 13z" />
      <path fill="#9b744b" d="m1 13 23 12v26L1 38z" />
      <path fill="#6c4c30" d="m47 13-23 12v26l23-13z" />
      <path
        fill="#4b8c2a"
        d="m1 13 23 12v10l-5-3v-5l-5-2v5l-5-3v-5l-8-4zm46 0L24 25v10l5-3v-5l5-2v5l5-3v-5l8-4z"
      />
      <path
        fill="#8cc552"
        d="m14 6 5 3-5 3-5-3zm15 2 5 3-5 3-5-3zM24 16l5 3-5 3-5-3z"
      />
      <path
        fill="#b38a5d"
        d="m4 25 5 3v5l-5-3zm9 9 5 3v5l-5-3zm-9 0 4 2v4l-4-2z"
      />
      <path
        fill="#8f6941"
        d="m38 26 5-3v5l-5 3zm-9 11 5-3v5l-5 3zm10-1 4-2v4l-4 2z"
      />
    </svg>
  );
}
