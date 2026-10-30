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
    <label className="flex flex-col gap-0.5 text-xs text-slate-600">
      {label}: {format(value)}
      <input
        type="range"
        className="w-32 accent-indigo-600"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={change}
      />
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
    <details className="flex-none rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-xs">
      <summary className="cursor-pointer font-medium text-slate-700">
        Simulator <span className="font-normal text-slate-500">· delays, failures and teammates</span>
      </summary>
      <div className="flex flex-wrap items-center gap-4 pt-3 pb-1">
        <Slider label="Min delay" field="minDelay" min={0} max={3000} step={100} format={(v) => `${v}ms`} />
        <Slider label="Max delay" field="maxDelay" min={0} max={5000} step={100} format={(v) => `${v}ms`} />
        <Slider label="Failure rate" field="failureRate" min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Teammate edits/min" field="editsPerMinute" min={0} max={1200} step={20} />
        <label className="chip">
          <input type="checkbox" className="check" checked={paused} onChange={togglePaused} /> Pause teammates
        </label>
        <button className="btn" onClick={() => arm(server.failNextSave, 'Next save will fail')}>Fail next save</button>
        <button className="btn" onClick={() => arm(server.forceConflictNextSave, 'Next save will conflict')}>
          Force conflict on next save
        </button>
      </div>
    </details>
  );
}
