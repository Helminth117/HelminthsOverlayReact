import React, { useState, useRef } from 'react';

const PRIO_ORDER = { alto: 0, medio: 1, bajo: 2, none: 3 };

function uid() {
  return 'x' + Date.now() + Math.random().toString(36).substr(2, 9);
}

const ObjectivesManager = React.memo(function ObjectivesManager({
  activeTab,
  session,
  setSession,
  notes,
  setNotes,
  plantillas,
  setPlantillas
}) {
  const [newObjective, setNewObjective] = useState({ name: '', cur: '', max: '', sub: '', prio: 'none', section: '' });
  const [newSection, setNewSection] = useState({ name: '', show: false });
  const [plantillaName, setPlantillaName] = useState('');
  const notesTimerRef = useRef(null);


  return (
    <main className={`tab-view ${activeTab === 'objetivos' ? 'active' : ''}`}>
      <div className="card">
        <h2 className="flex items-center justify-between">NUEVA TAREA</h2>
        <div className="flex-col gap-sm">
          <input className="inp" type="text" placeholder="Nombre (Ej. Jugar 5 partidas)" value={newObjective.name} onChange={e => setNewObjective({ ...newObjective, name: e.target.value })} />
          <div className="flex gap-sm">
            <input className="inp text-center" type="number" placeholder="Actual" min="0" value={newObjective.cur} onChange={e => setNewObjective({ ...newObjective, cur: e.target.value })} />
            <input className="inp text-center" type="number" placeholder="Meta" min="0" value={newObjective.max} onChange={e => setNewObjective({ ...newObjective, max: e.target.value })} />
          </div>
          <div className="flex gap-sm">
            <input className="inp flex-1" type="text" placeholder="Subtítulo o descripción (opcional)" value={newObjective.sub} onChange={e => setNewObjective({ ...newObjective, sub: e.target.value })} />
            <select className="inp" style={{ width: 130 }} value={newObjective.prio} onChange={e => setNewObjective({ ...newObjective, prio: e.target.value })}>
              <option value="alto">Alto (Rojo)</option>
              <option value="medio">Medio (Naranja)</option>
              <option value="bajo">Bajo (Verde)</option>
              <option value="none">Ninguno (Gris)</option>
            </select>
          </div>
          <div className="flex gap-sm mt-sm">
            <select className="inp flex-1" value={newObjective.section} onChange={e => setNewObjective({ ...newObjective, section: e.target.value })}>
              <option value="">-- Seleccionar Sección --</option>
              {(session.sections || []).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button className="btn btn-danger" title="Eliminar sección seleccionada" style={{ padding: '0 10px' }} onClick={() => {
              if (!newObjective.section) return;
              const sec = session.sections.find(s => s.id === newObjective.section);
              if (!sec) return;
              if (!window.confirm(`¿Estás seguro de eliminar la sección "${sec.label}" y TODOS sus objetivos?`)) return;
              const newS = { ...session, sections: session.sections.filter(s => s.id !== newObjective.section) };
              setSession(newS); window.api.saveSession(newS);
              if (newS.sections.length > 0) setNewObjective({ ...newObjective, section: newS.sections[0].id });
              else setNewObjective({ ...newObjective, section: '' });
            }}>🗑</button>
            <button className="btn btn-ghost" onClick={() => setNewSection({ ...newSection, show: !newSection.show })}>+ Sección</button>
          </div>
          {newSection.show && (
            <div className="flex gap-sm">
              <input className="inp flex-1" type="text" placeholder="Nombre de sección..." value={newSection.name} onChange={e => setNewSection({ ...newSection, name: e.target.value })} />
              <button className="btn btn-success" onClick={() => {
                if (!newSection.name.trim()) return;
                const newId = uid();
                const newS = { ...session, sections: [...(session.sections || []), { id: newId, label: newSection.name.trim(), items: [] }] };
                setSession(newS); window.api.saveSession(newS);
                setNewSection({ name: '', show: false });
                setNewObjective({ ...newObjective, section: newId });
              }}>Crear</button>
              <button className="btn btn-danger" onClick={() => setNewSection({ ...newSection, show: false })}>✕</button>
            </div>
          )}
          <button className="btn btn-primary mt-sm" onClick={() => {
            if (!newObjective.name.trim()) return;
            let secId = newObjective.section;
            if (!secId && session.sections && session.sections.length > 0) secId = session.sections[0].id;
            if (!secId) return;
            const newS = { ...session };
            const sec = newS.sections.find(s => s.id === secId);
            if (!sec) return;
            sec.items.push({ id: uid(), name: newObjective.name.trim(), cur: parseInt(newObjective.cur) || 0, max: parseInt(newObjective.max) || 0, sub: newObjective.sub.trim(), priority: newObjective.prio });
            setSession(newS); window.api.saveSession(newS);
            setNewObjective({ ...newObjective, name: '', cur: '', max: '', sub: '' });
          }}>Crear Objetivo</button>
        </div>
      </div>

      <div className="card">
        <h2 className="flex items-center justify-between">
          ACTIVOS
          <button className="btn btn-ghost text-xs" style={{ padding: '4px 8px' }} onClick={() => {
            if (!session.sections) return;
            if (!window.confirm('¿Seguro que quieres vaciar TODOS los objetivos actuales?')) return;
            const newS = { ...session, done: [] };
            newS.sections.forEach(s => s.items = []);
            setSession(newS); window.api.saveSession(newS);
          }}>Vaciar</button>
        </h2>
        <div className="flex-col gap-xs">
          {(session.sections || []).map(sec => {
            const pending = sec.items.filter(i => !(session.done || []).includes(i.id)).sort((a, b) => PRIO_ORDER[a.priority || 'none'] - PRIO_ORDER[b.priority || 'none']);
            if (!pending.length) return null;
            return (
              <React.Fragment key={sec.id}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '8px 0 4px' }}>{sec.label}</div>
                {pending.map(item => {
                  const pct = item.max > 0 ? Math.round((item.cur / item.max) * 100) : 0;
                  const colors = { alto: '#f43f5e', medio: '#f59e0b', bajo: '#10b981', none: 'transparent' };
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 8, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors[item.priority || 'none'], flexShrink: 0 }}></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        {item.max > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}><div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--success)', width: pct + '%' }}></div></div><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.cur}/{item.max}</span></div>}
                      </div>
                      <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => {
                        const newS = { ...session };
                        const sc = newS.sections.find(s => s.id === sec.id);
                        const it = sc.items.find(i => i.id === item.id);
                        it.cur = Math.max(0, Math.min(it.max || 9999, it.cur - 1));
                        setSession(newS); window.api.saveSession(newS);
                      }}>−</button>
                      <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => {
                        const newS = { ...session };
                        const sc = newS.sections.find(s => s.id === sec.id);
                        const it = sc.items.find(i => i.id === item.id);
                        it.cur = Math.max(0, Math.min(it.max || 9999, it.cur + 1));
                        if (it.max > 0 && it.cur >= it.max && !newS.done.includes(it.id)) {
                          newS.done.push(it.id);
                          window.api.itemCompleted({ itemId: it.id, itemName: it.name });
                        }
                        setSession(newS); window.api.saveSession(newS);
                      }}>+</button>
                      <button className="btn btn-success" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => {
                        const newS = { ...session };
                        if (!newS.done.includes(item.id)) {
                          newS.done.push(item.id);
                          window.api.itemCompleted({ itemId: item.id, itemName: item.name });
                        }
                        setSession(newS); window.api.saveSession(newS);
                      }}>✓</button>
                      <button className="btn btn-danger" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => {
                        const newS = { ...session };
                        const sc = newS.sections.find(s => s.id === sec.id);
                        sc.items = sc.items.filter(i => i.id !== item.id);
                        newS.done = newS.done.filter(id => id !== item.id);
                        setSession(newS); window.api.saveSession(newS);
                      }}>×</button>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2>COMPLETADOS</h2>
        <div className="flex-col gap-xs">
          {(() => {
            const doneItems = [];
            (session.sections || []).forEach(sec => sec.items.forEach(i => { if ((session.done || []).includes(i.id)) doneItems.push({ item: i, sec }); }));
            if (!doneItems.length) return <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 4 }}>Ninguno aún.</div>;
            return doneItems.map(({ item }) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)', borderRadius: 7, marginBottom: 4, opacity: 0.7 }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ flex: 1, fontSize: 12, textDecoration: 'line-through' }}>{item.name}</span>
                <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 10 }} onClick={() => {
                  const newS = { ...session, done: session.done.filter(id => id !== item.id) };
                  setSession(newS); window.api.saveSession(newS);
                }}>↩</button>
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="card">
        <h2>📝 Notas para el Stream</h2>
        <textarea className="inp" rows="3" placeholder="Anota tus ideas aquí..." value={notes} onChange={e => {
          setNotes(e.target.value);
          if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
          notesTimerRef.current = setTimeout(() => window.api.saveNotes(e.target.value), 800);
        }}></textarea>
      </div>

      <div className="card">
        <h2>Plantillas</h2>
        <div className="flex-col gap-xs mb-sm">
          {plantillas.length === 0 ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No hay plantillas.</div> : plantillas.map((p, i) => {
            const total = p.sections.reduce((a, s) => a + s.items.length, 0);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ flex: 1, fontSize: 12 }}>{p.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{total} obj</span>
                <button className="btn btn-success" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => {
                  if (!window.confirm('¿Cargar esta plantilla?')) return;
                  const sections = JSON.parse(JSON.stringify(p.sections));
                  sections.forEach(s => { s.id = uid(); s.items.forEach(it => { it.id = uid(); it.cur = 0; }); });
                  const newS = { ...session, sections, done: [] };
                  setSession(newS); window.api.saveSession(newS);
                }}>Cargar</button>
                <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={async () => {
                  if (!window.confirm('¿Borrar?')) return;
                  const newP = [...plantillas];
                  newP.splice(i, 1);
                  setPlantillas(newP);
                  await window.api.savePlantillas({ plantillas: newP });
                }}>×</button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-sm mt-md">
          <input className="inp" type="text" placeholder="Guardar plantilla como..." value={plantillaName} onChange={e => setPlantillaName(e.target.value)} />
          <button className="btn btn-ghost" onClick={async () => {
            if (!plantillaName.trim()) return;
            const newP = [...plantillas, { name: plantillaName.trim(), sections: JSON.parse(JSON.stringify(session.sections)) }];
            setPlantillas(newP);
            await window.api.savePlantillas({ plantillas: newP });
            setPlantillaName('');
          }}>Guardar</button>
        </div>
      </div>
    </main>
  );
});

export default ObjectivesManager;
