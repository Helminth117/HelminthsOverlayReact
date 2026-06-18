import React, { useState, useEffect } from 'react';
import { useOverlayStore } from '../../store';

export default function GoalsList() {
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (window.api) {
      window.api.getSession().then(session => {
        setSessionData(session);
      });
      
      const removeUpdate = window.api.on('session-updated', (session) => {
        setSessionData(session);
      });

      const removeListener = window.api.on('item-completed', (data) => {
        setSessionData(prev => {
          if (!prev) return prev;
          const doneSet = new Set(prev.done || []);
          doneSet.add(data.itemId.toString());
          return { ...prev, done: Array.from(doneSet) };
        });
      });

      return () => {
        window.api.off('session-updated', removeUpdate);
        window.api.off('item-completed', removeListener);
      };
    }
  }, []);

  const doneSet = new Set(sessionData?.done || []);

  return (
    <div id="obj-list-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {(sessionData?.sections || []).map((section, idx) => {
        const pending = (section.items || []).filter(i => !doneSet.has(i.id.toString()));
        if (!pending.length) return null;
        return (
          <div key={idx} className="obj-section">
            <div className="section-lbl">{section.label || 'OBJETIVOS'}</div>
            {pending.map(item => {
              const pct = item.max > 0 ? Math.round((item.cur / item.max) * 100) : 0;
              return (
                <div key={item.id} className="obj-card" data-id={item.id}>
                  <div className="obj-info">
                    <span className="obj-name">{item.name}</span>
                    <span className="obj-val" id={`obj-cur-${item.id}`}>
                      {item.cur.toLocaleString()} {item.max > 0 ? `/ ${item.max.toLocaleString()}` : ''}
                    </span>
                  </div>
                  {item.max > 0 && (
                    <div className="bar-bg">
                      <div className="bar-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
