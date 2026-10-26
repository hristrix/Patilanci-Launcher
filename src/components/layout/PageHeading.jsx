export default function PageHeading({ page, playerName, actions }) {
  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <div className="page-breadcrumb">
          Приложение <span>/</span> <strong>{page.label}</strong>
        </div>
        <h1>
          {page.home && playerName ? `Добре дошъл, ${playerName}` : page.title}
        </h1>
        <p>{page.description}</p>
      </div>
      {actions}
    </div>
  );
}
