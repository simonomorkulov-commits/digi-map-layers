import type { LayerKind, LoadLayer } from './types';

const values: Record<LayerKind, number> = {
  temperature: 24.6,
  wind: 5.8,
  insolation: 640,
};

/** Deterministic demo: wind's first request fails, its retry succeeds. */
export function createMockApi(): LoadLayer {
  const attempts = new Map<string, number>();

  return (layer, signal) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Запрос отменён', 'AbortError'));
        return;
      }

      const attempt = (attempts.get(layer.id) ?? 0) + 1;
      attempts.set(layer.id, attempt);
      const abort = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        reject(new DOMException('Запрос отменён', 'AbortError'));
      };
      const timer = setTimeout(
        () => {
          signal.removeEventListener('abort', abort);
          if (layer.kind === 'wind' && attempt === 1) {
            reject(
              new Error(
                'Сервис ветра временно недоступен. Повторите загрузку.',
              ),
            );
          } else {
            resolve({
              value: values[layer.kind],
              loadedAt: new Date().toISOString(),
            });
          }
        },
        layer.kind === 'wind' ? 1400 : 950,
      );
      signal.addEventListener('abort', abort, { once: true });
    });
}
