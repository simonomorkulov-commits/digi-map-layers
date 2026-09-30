import type { LayerDefinition, LayerId, LayerState, LoadLayer } from './types';

export interface StatePort {
  read(id: LayerId): LayerState;
  update(id: LayerId, change: (previous: LayerState) => LayerState): void;
}

/** Async orchestration is independent of React and the chosen store. */
export function createLayerController(
  catalog: readonly LayerDefinition[],
  state: StatePort,
  loadLayer: LoadLayer,
) {
  const definitions = new Map(catalog.map((layer) => [layer.id, layer]));
  const requests = new Map<LayerId, AbortController>();

  function cancel(id: LayerId) {
    const previous = requests.get(id);
    requests.delete(id); // Invalidate before abort callbacks can run.
    previous?.abort();
  }

  async function load(id: LayerId) {
    const definition = definitions.get(id);
    if (!definition) throw new Error(`Неизвестный слой: ${id}`);
    cancel(id);
    const request = new AbortController();
    requests.set(id, request);
    state.update(id, (previous) => ({
      ...previous,
      enabled: true,
      load: { status: 'loading' },
    }));

    // Abort is an optimization; identity is the correctness guarantee even
    // when an API ignores cancellation or resolves in the same microtask.
    const isCurrent = () =>
      requests.get(id) === request && state.read(id).enabled;

    try {
      const data = await loadLayer(definition, request.signal);
      if (isCurrent()) {
        state.update(id, (previous) => ({
          ...previous,
          load: { status: 'success', data },
        }));
      }
    } catch (error: unknown) {
      if (isCurrent()) {
        state.update(id, (previous) => ({
          ...previous,
          load: {
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Не удалось загрузить слой',
          },
        }));
      }
    } finally {
      if (requests.get(id) === request) requests.delete(id);
    }
  }

  return {
    setEnabled(id: LayerId, enabled: boolean) {
      if (state.read(id).enabled === enabled) return;
      if (enabled) {
        void load(id);
      } else {
        cancel(id);
        state.update(id, (previous) => ({
          ...previous,
          enabled: false,
          load: { status: 'idle' },
        }));
      }
    },
    setOpacity(id: LayerId, value: number) {
      if (!Number.isFinite(value)) return;
      const opacity = Math.min(1, Math.max(0, value));
      state.update(id, (previous) =>
        previous.opacity === opacity ? previous : { ...previous, opacity },
      );
    },
    retry(id: LayerId) {
      const layer = state.read(id);
      if (layer.enabled && layer.load.status === 'error') void load(id);
    },
    cancelAll() {
      for (const id of [...requests.keys()]) {
        cancel(id);
        state.update(id, (previous) => ({
          ...previous,
          enabled: false,
          load: { status: 'idle' },
        }));
      }
    },
  };
}

export type LayerController = ReturnType<typeof createLayerController>;
