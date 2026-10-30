import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App.jsx';
import { generateDeals } from './server/generateDeals.js';
import { createFakeServer } from './server/fakeServer.js';
import { createAppStore } from './store/index.js';
import { dealsLoaded, dealsUpdated } from './store/dealsSlice.js';
import { rowsRefreshed } from './store/uiSlice.js';
import { EngineContext } from './sync/EngineContext.js';
import { createSyncEngine } from './sync/syncEngine.js';
import './styles.css';

const server = createFakeServer({ deals: generateDeals() });
const store = createAppStore();
const engine = createSyncEngine({ api: server, store });

async function start() {
  store.dispatch(dealsLoaded(await server.getDeals()));
  store.dispatch(rowsRefreshed());
  server.subscribe((deals) => store.dispatch(dealsUpdated(deals)));
  server.startTeammates();

  createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <EngineContext.Provider value={{ engine, server }}>
        <App />
      </EngineContext.Provider>
    </Provider>,
  );
}

start();
