import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LayerCard } from '../components/LayerCard';
import { layerCatalog } from './catalog';
import { createMockApi } from './mockApi';
import { LayersProvider, useLayerActions, useLayerState } from './store';
import type { LayerDefinition, LoadLayer } from './types';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('React + actual vedro integration', () => {
  it('updates one subscriber among 120 and does not re-render its siblings', () => {
    const catalog: LayerDefinition[] = Array.from({ length: 120 }, (_, i) => ({
      id: `layer-${i}`,
      kind: 'temperature',
      name: `Layer ${i}`,
      description: '',
      unit: '°C',
      color: '#fff',
    }));
    const renders = new Map<string, number>();
    function Probe({ id }: { id: string }) {
      const state = useLayerState(id);
      const actions = useLayerActions();
      renders.set(id, (renders.get(id) ?? 0) + 1);
      return (
        <button onClick={() => actions.setOpacity(id, 0.5)}>
          {id}: {state.opacity}
        </button>
      );
    }
    render(
      <StrictMode>
        <LayersProvider catalog={catalog} loadLayer={vi.fn<LoadLayer>()}>
          {catalog.map((layer) => (
            <Probe key={layer.id} id={layer.id} />
          ))}
        </LayersProvider>
      </StrictMode>,
    );
    const baseline = new Map(renders);
    fireEvent.click(screen.getByRole('button', { name: 'layer-0: 0.7' }));
    expect(screen.getByRole('button', { name: 'layer-0: 0.5' })).toBeTruthy();
    expect(renders.get('layer-0')).toBeGreaterThan(
      baseline.get('layer-0') ?? 0,
    );
    for (const layer of catalog.slice(1))
      expect(renders.get(layer.id)).toBe(baseline.get(layer.id));
    const updated = renders.get('layer-0');
    fireEvent.click(screen.getByRole('button', { name: 'layer-0: 0.5' }));
    expect(renders.get('layer-0')).toBe(updated);
  });

  it('supports switching a subscription to another layer ID', () => {
    function Probe({ id }: { id: string }) {
      const state = useLayerState(id);
      const actions = useLayerActions();
      return (
        <button onClick={() => actions.setOpacity(id, 0.2)}>
          {id}: {state.opacity}
        </button>
      );
    }
    const api = vi.fn<LoadLayer>();
    const view = render(
      <LayersProvider catalog={layerCatalog} loadLayer={api}>
        <Probe id="temperature" />
      </LayersProvider>,
    );
    fireEvent.click(screen.getByRole('button'));
    view.rerender(
      <LayersProvider catalog={layerCatalog} loadLayer={api}>
        <Probe id="wind" />
      </LayersProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('wind: 0.7');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('wind: 0.2');
  });

  it('shows loading, error and success on retry through the real UI', async () => {
    vi.useFakeTimers();
    const wind = layerCatalog.find((layer) => layer.id === 'wind');
    if (!wind) throw new Error('Missing wind');
    render(
      <StrictMode>
        <LayersProvider catalog={layerCatalog} loadLayer={createMockApi()}>
          <LayerCard layer={wind} />
        </LayersProvider>
      </StrictMode>,
    );
    fireEvent.click(
      screen.getByRole('switch', { name: 'Включить слой Ветер' }),
    );
    expect(
      screen.getByRole('status', { name: 'Статус слоя Ветер' }).textContent,
    ).toContain('loading');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400);
    });
    expect(
      screen.getByRole('status', { name: 'Статус слоя Ветер' }).textContent,
    ).toContain('error');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400);
    });
    expect(
      screen.getByRole('status', { name: 'Статус слоя Ветер' }).textContent,
    ).toContain('success');
    expect(
      screen.getByRole('status', { name: 'Статус слоя Ветер' }).textContent,
    ).toContain('5.8');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } });
    expect(screen.getByText('40%')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch'));
    expect(
      screen.getByRole('status', { name: 'Статус слоя Ветер' }).textContent,
    ).toContain('idle');
  });

  it('aborts pending work on unmount under StrictMode', () => {
    let signal: AbortSignal | undefined;
    const api: LoadLayer = (_layer, nextSignal) => {
      signal = nextSignal;
      return new Promise(() => {});
    };
    function Enable() {
      const actions = useLayerActions();
      return (
        <button onClick={() => actions.setEnabled('temperature', true)}>
          Enable
        </button>
      );
    }
    const view = render(
      <StrictMode>
        <LayersProvider catalog={layerCatalog} loadLayer={api}>
          <Enable />
        </LayersProvider>
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(signal?.aborted).toBe(false);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
