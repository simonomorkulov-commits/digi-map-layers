export type LayerId = string;
export type LayerKind = 'temperature' | 'wind' | 'insolation';

export interface LayerDefinition {
  readonly id: LayerId;
  readonly kind: LayerKind;
  readonly name: string;
  readonly description: string;
  readonly unit: string;
  readonly color: string;
}

export interface LayerData {
  readonly value: number;
  readonly loadedAt: string;
}

export type LoadState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: LayerData }
  | { readonly status: 'error'; readonly message: string };

export interface LayerState {
  readonly enabled: boolean;
  readonly opacity: number;
  readonly load: LoadState;
}

export type LayersState = Record<LayerId, LayerState>;
export type LoadLayer = (
  layer: LayerDefinition,
  signal: AbortSignal,
) => Promise<LayerData>;

export function initialLayerState(): LayerState {
  return { enabled: false, opacity: 0.7, load: { status: 'idle' } };
}
