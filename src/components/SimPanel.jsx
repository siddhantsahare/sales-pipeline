import { useDispatch, useSelector } from 'react-redux';
import { announced, simChanged } from '../store/uiSlice.js';
import { useEngine } from '../sync/EngineContext.js';

function Slider({ label, field, min, max, step, format = String }) {
  const dispatch = useDispatch();
  const { server } = useEngine();
  const value = useSelector((state) => state.ui.sim[field]);

  function change(event) {
    const next = { [field]: Number(event.target.value) };
    dispatch(simChanged(next));
    server.updateSettings(next);
  }

  return (
    <label>
      {label}: {format(value)}
      <input type="range" min={min} max={max} step={step} value={value} onChange={change} />
    </label>
  );
}

export default function SimPanel() {
  const dispatch = useDispatch();
  const { server } = useEngine();
  const paused = useSelector((state) => state.ui.sim.paused);

  function togglePaused(event) {
    dispatch(simChanged({ paused: event.target.checked }));
    server.updateSettings({ paused: event.target.checked });
  }

  function arm(action, message) {
    action();
    dispatch(announced(message));
  }

  return (
    <details className="sim-panel" open>
      <summary>Simulator</summary>
      <div>
        <Slider label="Min delay" field="minDelay" min={0} max={3000} step={100} format={(v) => `${v}ms`} />
        <Slider label="Max delay" field="maxDelay" min={0} max={5000} step={100} format={(v) => `${v}ms`} />
        <Slider label="Failure rate" field="failureRate" min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Teammate edits/min" field="editsPerMinute" min={0} max={1200} step={20} />
        <label><input type="checkbox" checked={paused} onChange={togglePaused} /> Pause teammates</label>
        <button onClick={() => arm(server.failNextSave, 'Next save will fail')}>Fail next save</button>
        <button onClick={() => arm(server.forceConflictNextSave, 'Next save will conflict')}>Force conflict on next save</button>
      </div>
    </details>
  );
}
