import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createVedro } from 'vedro';
import { createLayerController, type LayerController } from './controller';
import {
  initialLayerState,
  type LayerDefinition,
  type LayerId,
  type LayersState,
  type LoadLayer,
} from './types';

const { Provider: VedroProvider, useStore } = createVedro<LayersState>({});
const ActionsContext = createContext<LayerController | null>(null);

function ControllerProvider({
  catalog,
  loadLayer,
  children,
}: {
  catalog: readonly LayerDefinition[];
  loadLayer: LoadLayer;
  children: ReactNode;
}) {
  const store = useStore();
  const [controller] = useState(() =>
    createLayerController(
      catalog,
      {
        read(id) {
          const layer = store.get(id);
          if (!layer) throw new Error(`Неизвестный слой: ${id}`);
          return layer;
        },
        update(id, change) {
          const previous = store.get(id);
          if (!previous) throw new Error(`Неизвестный слой: ${id}`);
          const next = change(previous);
          if (next !== previous) store.dispatch(id, next);
        },
      },
      loadLayer,
    ),
  );

  useEffect(() => () => controller.cancelAll(), [controller]);
  return (
    <ActionsContext.Provider value={controller}>
      {children}
    </ActionsContext.Provider>
  );
}

/** Catalog and API are fixed for this provider's lifetime; remount to replace. */
export function LayersProvider({
  catalog,
  loadLayer,
  children,
}: {
  catalog: readonly LayerDefinition[];
  loadLayer: LoadLayer;
  children: ReactNode;
}) {
  const [initialState] = useState<LayersState>(() => {
    const entries = catalog.map(
      (layer) => [layer.id, initialLayerState()] as const,
    );
    if (new Set(catalog.map((layer) => layer.id)).size !== catalog.length) {
      throw new Error('Идентификаторы слоёв должны быть уникальными');
    }
    return Object.fromEntries(entries);
  });

  return (
    <VedroProvider state={initialState}>
      <ControllerProvider catalog={catalog} loadLayer={loadLayer}>
        {children}
      </ControllerProvider>
    </VedroProvider>
  );
}

/** Subscribe directly to a Vedro key, with React 19's external-store contract.
 * The bundled selector uses @state + JSON.stringify for every subscriber.
 * Keeping entity references stable avoids that full-store subscription cost.
 */
export function useLayerState(id: LayerId) {
  const store = useStore();
  const subscribe = useCallback(
    (onChange: () => void) => store.on(id, () => onChange()),
    [store, id],
  );
  const getSnapshot = useCallback(() => {
    const layer = store.get(id);
    if (!layer) throw new Error(`Неизвестный слой: ${id}`);
    return layer;
  }, [store, id]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useLayerActions() {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('Нужен LayersProvider');
  return actions;
}
