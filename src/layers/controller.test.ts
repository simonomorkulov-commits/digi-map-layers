import { describe, expect, it, vi } from 'vitest';
import { layerCatalog } from './catalog';
import { createLayerController } from './controller';
import {
  initialLayerState,
  type LayerData,
  type LayersState,
  type LoadLayer,
} from './types';

function deferred() {
  let resolve!: (data: LayerData) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<LayerData>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const data: LayerData = { value: 24.6, loadedAt: '2026-09-30T00:00:00Z' };
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function setup(api: LoadLayer) {
  const state: LayersState = Object.fromEntries(
    layerCatalog.map((layer) => [layer.id, initialLayerState()]),
  );
  function read(id: string) {
    const value = state[id];
    if (!value) throw new Error('Unknown layer');
    return value;
  }
  const controller = createLayerController(
    layerCatalog,
    {
      read,
      update(id, change) {
        state[id] = change(read(id));
      },
    },
    api,
  );
  return { controller, read };
}

describe('layer request lifecycle', () => {
  it('loads on enable and preserves opacity changed while loading', async () => {
    const request = deferred();
    const api = vi.fn<LoadLayer>(() => request.promise);
    const { controller, read } = setup(api);
    controller.setEnabled('temperature', true);
    expect(read('temperature').load.status).toBe('loading');
    controller.setEnabled('temperature', true);
    expect(api).toHaveBeenCalledTimes(1);
    controller.setOpacity('temperature', 0.3);
    request.resolve(data);
    await flush();
    expect(read('temperature')).toEqual({
      enabled: true,
      opacity: 0.3,
      load: { status: 'success', data },
    });
  });

  it('aborts on disable and ignores a late success from an uncancellable API', async () => {
    const request = deferred();
    const api = vi.fn<LoadLayer>(() => request.promise);
    const { controller, read } = setup(api);
    controller.setEnabled('temperature', true);
    const signal = api.mock.calls[0]?.[1];
    controller.setEnabled('temperature', false);
    expect(signal?.aborted).toBe(true);
    request.resolve(data);
    await flush();
    expect(read('temperature')).toEqual(initialLayerState());
  });

  it.each(['success', 'error'] as const)(
    'ignores stale %s after off/on; older finally cannot delete newer request',
    async (outcome) => {
      const old = deferred();
      const current = deferred();
      const api = vi
        .fn<LoadLayer>()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(current.promise);
      const { controller, read } = setup(api);
      controller.setEnabled('temperature', true);
      controller.setEnabled('temperature', false);
      controller.setEnabled('temperature', true);
      if (outcome === 'success') old.resolve({ ...data, value: -100 });
      else old.reject(new Error('Stale error'));
      await flush();
      expect(read('temperature').load.status).toBe('loading');
      current.resolve(data);
      await flush();
      expect(read('temperature').load).toEqual({ status: 'success', data });
    },
  );

  it('does not overwrite a newer success with an older response', async () => {
    const old = deferred();
    const current = deferred();
    const api = vi
      .fn<LoadLayer>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    const { controller, read } = setup(api);
    controller.setEnabled('temperature', true);
    controller.setEnabled('temperature', false);
    controller.setEnabled('temperature', true);
    current.resolve(data);
    await flush();
    old.resolve({ ...data, value: -100 });
    await flush();
    expect(read('temperature').load).toEqual({ status: 'success', data });
  });

  it('handles unknown rejection values and permits only one retry in flight', async () => {
    const retry = deferred();
    const api = vi
      .fn<LoadLayer>()
      .mockRejectedValueOnce('network failure')
      .mockReturnValueOnce(retry.promise);
    const { controller, read } = setup(api);
    controller.retry('wind');
    expect(api).not.toHaveBeenCalled();
    controller.setEnabled('wind', true);
    await flush();
    expect(read('wind').load).toEqual({
      status: 'error',
      message: 'Не удалось загрузить слой',
    });
    controller.retry('wind');
    controller.retry('wind');
    expect(api).toHaveBeenCalledTimes(2);
    retry.resolve(data);
    await flush();
    expect(read('wind').load.status).toBe('success');
    controller.retry('wind');
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('allows independent parallel layers and cancels them on cleanup', async () => {
    const a = deferred();
    const b = deferred();
    const api = vi
      .fn<LoadLayer>()
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise);
    const { controller, read } = setup(api);
    controller.setEnabled('temperature', true);
    controller.setEnabled('wind', true);
    controller.cancelAll();
    expect(api.mock.calls.every(([, signal]) => signal.aborted)).toBe(true);
    a.resolve(data);
    b.reject(new Error('Late error'));
    await flush();
    expect(read('temperature').enabled).toBe(false);
    expect(read('wind').load.status).toBe('idle');
  });

  it('clamps opacity and ignores non-finite input without a request', () => {
    const api = vi.fn<LoadLayer>();
    const { controller, read } = setup(api);
    controller.setOpacity('wind', 2);
    expect(read('wind').opacity).toBe(1);
    controller.setOpacity('wind', -2);
    expect(read('wind').opacity).toBe(0);
    controller.setOpacity('wind', Number.NaN);
    expect(read('wind').opacity).toBe(0);
    expect(api).not.toHaveBeenCalled();
  });
});
