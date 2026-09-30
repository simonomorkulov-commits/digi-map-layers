import { LayerCard } from './components/LayerCard';
import { MapPreview } from './components/MapPreview';
import { layerCatalog } from './layers/catalog';
import { createMockApi } from './layers/mockApi';
import { LayersProvider } from './layers/store';

const mockApi = createMockApi();

export default function App() {
  return (
    <LayersProvider catalog={layerCatalog} loadLayer={mockApi}>
      <div className="app-shell">
        <header className="app-header">
          <a className="brand" href="./" aria-label="DiGi, главная">
            di<span>g</span>i<span className="brand-dot">.</span>
          </a>
          <div className="header-divider" />
          <span className="header-caption">Geoanalytics / Layer studio</span>
          <span className="demo-badge">Тестовое задание</span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">ГЕОАНАЛИТИКА</span>
              <h1>Данные в слоях.</h1>
              <p>
                Выберите, что видеть на карте. Настройте каждый слой отдельно.
              </p>
            </div>
            <span className="catalog-label">
              03 <span>СЛОЯ ДАННЫХ</span>
            </span>
          </div>
          <div className="workspace">
            <aside className="layers-panel" aria-label="Управление слоями">
              <div className="panel-heading">
                <h2>Картографические слои</h2>
                <span>01—03</span>
              </div>
              {layerCatalog.map((layer) => (
                <LayerCard key={layer.id} layer={layer} />
              ))}
              <div className="demo-tip">
                <span>ПРОВЕРКА ОШИБКИ</span>
                <p>
                  Первая загрузка ветра завершится ошибкой. Нажмите «Повторить
                  загрузку», чтобы получить данные.
                </p>
              </div>
            </aside>
            <MapPreview catalog={layerCatalog} />
          </div>
          <footer className="page-footer">
            <span>DiGi · Layer management</span>
            <span>React 19 / TypeScript / vedro</span>
          </footer>
        </main>
      </div>
    </LayersProvider>
  );
}
