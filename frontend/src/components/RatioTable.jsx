// Tabel "Rasio Performa" (pengganti kartu MetricCard), mengikuti gaya tabel desain Figma.
// Nilai & status HANYA dari display/status backend (tanpa menghitung ulang di frontend).
// Satu tabel per kelompok (Profitabilitas, Likuiditas, ...). Kolom: Rasio · Nilai · Status · Arti · Rujukan.
import SourcePageLink from './SourcePageLink.jsx';

const STATUS_LABELS = { sehat: 'Sehat', waspada: 'Waspada', lemah: 'Lemah' };

function sourcePages(metric, fields) {
  const pages = (metric?.inputs ?? [])
    .map((k) => fields?.[k]?.page)
    .filter((p) => Number.isFinite(p) && p > 0);
  return [...new Set(pages)].sort((a, b) => a - b);
}

export default function RatioTable({ groups, metrics, fields, entity, isQuarterly }) {
  const fileId = entity?.file_id ?? null;
  const fileUrl = entity?.file_url ?? null;

  return (
    <div className="ratio-groups">
      {groups.map((group) => (
        <section key={group.title} className="ratio-group" aria-label={group.title}>
          <h3 className="ratio-group-title">{group.title}</h3>
          <div className="ratio-table-card">
            <table className="ratio-table">
              <thead>
                <tr>
                  <th scope="col">Rasio</th>
                  <th scope="col" className="ratio-value">Nilai</th>
                  <th scope="col">Status</th>
                  <th scope="col">Arti</th>
                  <th scope="col">Rujukan</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item, idx) => {
                  const metric = metrics?.[item.key];
                  const display = metric?.display ?? '—';
                  const isNull = !metric || metric.value == null || display === '—';
                  const status = isNull ? null : metric?.status ?? null;
                  const annualized = item.annualizedQuarterly && isQuarterly;
                  const pages = sourcePages(metric, fields);
                  return (
                    <tr
                      key={item.key}
                      className={`${idx % 2 === 1 ? 'ratio-row-alt' : ''} ${isNull ? 'ratio-row-null' : ''}`}
                      title={metric?.formula ? `Rumus: ${metric.formula}` : undefined}
                    >
                      <th scope="row" className="ratio-name">
                        {item.label}
                        {annualized && (
                          <sup className="annualized-mark" title="Disetahunkan dari laporan kuartalan">
                            *
                          </sup>
                        )}
                      </th>
                      <td className="ratio-value" data-label="Nilai">
                        {display}
                      </td>
                      <td data-label="Status">
                        {status ? (
                          <span className={`ratio-status ratio-status-${status}`}>{STATUS_LABELS[status] ?? status}</span>
                        ) : (
                          <span className="ratio-muted">{isNull ? 'Tidak dihitung' : 'Tanpa ambang'}</span>
                        )}
                      </td>
                      <td className="ratio-desc" data-label="Arti">
                        {item.desc}
                      </td>
                      <td data-label="Rujukan">
                        {pages.length ? (
                          <span className="ratio-refs">
                            Hal.{' '}
                            {pages.map((page, i) => (
                              <span key={page}>
                                {i > 0 && ', '}
                                <SourcePageLink fileId={fileId} fileUrl={fileUrl} page={page}>
                                  {page}
                                </SourcePageLink>
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="ratio-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
