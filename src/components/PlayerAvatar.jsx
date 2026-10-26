// Lightweight Steve fallback while the textured 3D preview initializes.
export default function PlayerAvatar() {
  return (
    <svg
      className="player-voxel-avatar"
      viewBox="0 0 16 32"
      role="img"
      aria-label="Стив"
      shapeRendering="crispEdges"
    >
      <path fill="#aa7d66" d="M4 0h8v8H4zM0 12h4v12H0zM12 12h4v12h-4z" />
      <path fill="#34271f" d="M4 0h8v3h-1V2H5v1H4z" />
      <path fill="#fff" d="M5 4h2v1H5zM9 4h2v1H9z" />
      <path fill="#494697" d="M6 4h1v1H6zM9 4h1v1H9z" />
      <path fill="#684332" d="M7 5h2v1H7zM6 6h1v1h2V6h1v2H6z" />
      <path fill="#00a6aa" d="M0 8h16v4h-4v8H4v-8H0z" />
      <path fill="#aa7d66" d="M6 8h4v1H9v1H7V9H6z" />
      <path fill="#00858c" d="M5 11h1v8H5zM10 13h1v7h-1z" />
      <path fill="#494697" d="M4 20h8v12H4z" />
      <path fill="#34326a" d="M7 21h2v10H7z" />
      <path fill="#424142" d="M4 30h8v2H4z" />
    </svg>
  );
}
