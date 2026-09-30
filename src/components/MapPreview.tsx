import { memo } from 'react';
import { useLayerState } from '../layers/store';
import type { LayerDefinition } from '../layers/types';

const MapOverlay = memo(function MapOverlay({
  layer,
}: {
  layer: LayerDefinition;
}) {
  const { enabled, opacity, load } = useLayerState(layer.id);
  if (!enabled || load.status !== 'success') return null;

  return (
    <g opacity={opacity} data-testid={`overlay-${layer.id}`}>
      {layer.kind === 'temperature' && (
        <g fill="url(#heat)">
          <ellipse cx="340" cy="275" rx="240" ry="160" />
          <ellipse cx="675" cy="390" rx="180" ry="130" />
        </g>
      )}
      {layer.kind === 'wind' && (
        <g fill="none" stroke="#428faa" strokeWidth="3" markerEnd="url(#arrow)">
          {Array.from({ length: 18 }, (_, i) => (
            <path
              key={i}
              d={`M ${110 + (i % 6) * 130} ${170 + Math.floor(i / 6) * 130} q 30 -28 75 -12`}
            />
          ))}
        </g>
      )}
      {layer.kind === 'insolation' && (
        <rect
          x="65"
          y="95"
          width="830"
          height="460"
          rx="90"
          fill="url(#solar)"
        />
      )}
    </g>
  );
});

export function MapPreview({
  catalog,
}: {
  catalog: readonly LayerDefinition[];
}) {
  return (
    <section
      className="map-panel"
      aria-label="Предпросмотр картографических слоёв"
    >
      <div className="map-heading">
        <div>
          <span className="eyebrow">ОБЛАСТЬ НАБЛЮДЕНИЯ</span>
          <h2>Чуйская долина</h2>
        </div>
        <span className="map-tag">Кыргызстан · DEMO</span>
      </div>
      <div className="map-canvas">
        <svg
          viewBox="0 0 960 630"
          role="img"
          aria-label="Схематичная карта с наложением включённых и загруженных слоёв"
        >
          <defs>
            <pattern
              id="grid"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M80 0H0V80"
                fill="none"
                stroke="#bec9bd"
                strokeWidth="0.7"
              />
            </pattern>
            <radialGradient id="heat">
              <stop stopColor="#e2814c" stopOpacity="0.9" />
              <stop offset="1" stopColor="#eeb66b" stopOpacity="0" />
            </radialGradient>
            <pattern
              id="solar"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <rect
                x="2"
                y="2"
                width="24"
                height="24"
                rx="3"
                fill="#dfba4b"
                fillOpacity="0.35"
              />
            </pattern>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path
                d="M0 0L10 5L0 10"
                fill="none"
                stroke="#428faa"
                strokeWidth="2"
              />
            </marker>
          </defs>
          <rect width="960" height="630" fill="#e7eadf" />
          <rect width="960" height="630" fill="url(#grid)" />
          <g fill="none" stroke="#c8ceba" strokeWidth="1.4">
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d={`M-20 ${360 + i * 19} Q150 ${250 + i * 25} 320 ${370 + i * 16} T640 ${380 + i * 15} T990 ${280 + i * 30}`}
              />
            ))}
          </g>
          <path
            d="M-20 235Q140 340 285 249T540 245T980 145"
            fill="none"
            stroke="#99bec0"
            strokeWidth="11"
          />
          <path
            d="M-20 235Q140 340 285 249T540 245T980 145"
            fill="none"
            stroke="#cae1dc"
            strokeWidth="5"
          />
          <path
            d="M55 340L305 322L540 295L735 250L940 260"
            fill="none"
            stroke="#faf8ec"
            strokeWidth="12"
          />
          <path
            d="M55 340L305 322L540 295L735 250L940 260"
            fill="none"
            stroke="#ccbc98"
            strokeWidth="2"
            strokeDasharray="5 6"
          />
          <path
            d="M330 120L320 320L370 500M580 110L540 295L600 550"
            fill="none"
            stroke="#f7f6ed"
            strokeWidth="5"
          />
          {catalog.map((layer) => (
            <MapOverlay key={layer.id} layer={layer} />
          ))}
          <g fill="#263c30" fontFamily="system-ui" fontSize="14">
            <circle cx="320" cy="320" r="8" fill="#fff" />
            <circle cx="320" cy="320" r="4" />
            <text x="337" y="317" fontWeight="700" fontSize="18">
              Бишкек
            </text>
            <circle cx="735" cy="250" r="5" />
            <text x="749" y="243">
              Токмок
            </text>
            <circle cx="135" cy="333" r="4" />
            <text x="103" y="363">
              Кара-Балта
            </text>
            <text x="565" y="512" fill="#859078" letterSpacing="5">
              КЫРГЫЗСКИЙ ХРЕБЕТ
            </text>
          </g>
        </svg>
        <div className="north" aria-hidden="true">
          N<span>↑</span>
        </div>
        <div className="map-note">
          <span className="status-dot success" /> Схематичный предпросмотр
        </div>
      </div>
      <div className="map-footer">
        <span>Демонстрационные данные · без GIS-привязки</span>
        <span>42.87° N / 74.60° E</span>
      </div>
    </section>
  );
}
