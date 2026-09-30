import type { LayerDefinition } from './types';

export const layerCatalog: readonly LayerDefinition[] = [
  {
    id: 'temperature',
    kind: 'temperature',
    name: 'Температура',
    description: 'Температура поверхности',
    unit: '°C',
    color: '#df895d',
  },
  {
    id: 'wind',
    kind: 'wind',
    name: 'Ветер',
    description: 'Скорость воздушных потоков',
    unit: 'м/с',
    color: '#6ca5b5',
  },
  {
    id: 'insolation',
    kind: 'insolation',
    name: 'Инсоляция',
    description: 'Солнечная энергия на поверхности',
    unit: 'Вт/м²',
    color: '#caac4e',
  },
];
