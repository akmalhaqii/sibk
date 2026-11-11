// FR-EXT-05: label dwibahasa -> field kanonik (exact, contains, fuzzy); tak dikenal -> ditandai untuk koreksi
import labels from '../../config/labels.json' with { type: 'json' };

export function mapFields(rows, { ticker }) {
  return { entity: { ticker }, fields: {}, unmapped: [] };
}
