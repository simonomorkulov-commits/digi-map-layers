import { memo } from 'react';
import { useLayerActions, useLayerState } from '../layers/store';
import type { LayerDefinition } from '../layers/types';

const statusLabels = {
  idle: 'Выключен',
  loading: 'Загрузка',
  success: 'Загружен',
  error: 'Ошибка',
} as const;
const symbols = { temperature: '◉', wind: '≋', insolation: '☀' } as const;

export const LayerCard = memo(function LayerCard({
  layer,
}: {
  layer: LayerDefinition;
}) {
  const { enabled, opacity, load } = useLayerState(layer.id);
  const actions = useLayerActions();

  return (
    <article className={`layer-card ${enabled ? 'is-enabled' : ''}`}>
      <div className="layer-top">
        <span
          className="layer-icon"
          style={{ color: layer.color }}
          aria-hidden="true"
        >
          {symbols[layer.kind]}
        </span>
        <div className="layer-title">
          <h3>{layer.name}</h3>
          <p>{layer.description}</p>
        </div>
        <input
          className="toggle"
          type="checkbox"
          role="switch"
          aria-label={`Включить слой ${layer.name}`}
          checked={enabled}
          onChange={(event) =>
            actions.setEnabled(layer.id, event.target.checked)
          }
        />
      </div>
      <div
        className="layer-status"
        role="status"
        aria-live="polite"
        aria-label={`Статус слоя ${layer.name}`}
      >
        <span className={`status-dot ${load.status}`} />
        {statusLabels[load.status]}
        <span className="status-code">{load.status}</span>
        {load.status === 'success' && (
          <span className="layer-value">
            {load.data.value} {layer.unit}
          </span>
        )}
      </div>
      <div className="opacity-label">
        <label htmlFor={`opacity-${layer.id}`}>Прозрачность · opacity</label>
        <output htmlFor={`opacity-${layer.id}`}>
          {Math.round(opacity * 100)}%
        </output>
      </div>
      <input
        id={`opacity-${layer.id}`}
        className="opacity-slider"
        type="range"
        aria-label={`Прозрачность слоя ${layer.name}`}
        min="0"
        max="100"
        step="1"
        value={Math.round(opacity * 100)}
        onChange={(event) =>
          actions.setOpacity(layer.id, event.target.valueAsNumber / 100)
        }
      />
      {load.status === 'error' && (
        <div className="error-box">
          <p>{load.message}</p>
          <button
            className="retry-button"
            onClick={() => actions.retry(layer.id)}
          >
            Повторить загрузку
          </button>
        </div>
      )}
    </article>
  );
});
