// NFR-02 / R-03: Tautan buka PDF sumber pada halaman tertentu (/files/<file_id>.pdf#page=N)
export default function SourcePageLink({ fileId, fileUrl, page, children }) {
  if (!page) return null;
  const base = fileUrl ?? (fileId ? `/files/${fileId}.pdf` : null);
  if (!base) return <span className="source-page-badge">Hal. {page}</span>;
  return (
    <a className="SourcePageLink" href={`${base}#page=${page}`} target="_blank" rel="noreferrer">
      {children ?? `Hal. ${page}`}
    </a>
  );
}
