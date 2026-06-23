import React, { useState, useEffect, useMemo } from 'react';

const StreamChatPanel = React.memo(function StreamChatPanel() {
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    const handler = window.api.on('tiktok-chat', (data) => {
      setChatHistory(prev => {
        const next = [...prev, data];
        if (next.length > 50) next.shift();
        return next;
      });
    });
    return () => {
      if (handler) window.api.off('tiktok-chat', handler);
    };
  }, []);

  const reversedChat = useMemo(() => {
    return [...chatHistory].reverse();
  }, [chatHistory]);

  if (chatHistory.length === 0) return null;

  return (
    <div className="card" id="tiktok-chat-card">
      <h2 className="mb-sm">Chat del Stream</h2>
      <div id="tt-chat-list" className="flex-col" style={{ maxHeight: 350, overflowY: 'auto' }}>
        {reversedChat.map((msg, idx) => (
          <div key={idx} className="flex items-center justify-between p-xs" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
              {msg.isMod && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '2px 4px', borderRadius: 4, marginRight: 4 }}>MOD</span>}
              {msg.isSub && <span style={{ background: '#8b5cf6', color: '#fff', fontSize: 10, padding: '2px 4px', borderRadius: 4, marginRight: 4 }}>SUB</span>}
              <strong style={{ color: 'var(--text-main)' }}>{msg.user}:</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{msg.text}</span>
            </div>
            <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => window.api.pinChatMessage(msg)}>📌 Pin</button>
          </div>
        ))}
      </div>
    </div>
  );
});

export default StreamChatPanel;
