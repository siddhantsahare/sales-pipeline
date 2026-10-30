import DealTable from './components/DealTable.jsx';
import LiveRegion from './components/LiveRegion.jsx';
import StageStrip from './components/StageStrip.jsx';
import TopBar from './components/TopBar.jsx';

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <StageStrip />
      <DealTable />
      <LiveRegion />
    </div>
  );
}
