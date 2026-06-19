import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { DraggableWidget } from './DraggableWidget';

export default function LyricsDisplay() {
  const [lyrics, setLyrics] = useState({ prev: '', current: '', next: '' });
  const [currentText, setCurrentText] = useState('');
  const [prevText, setPrevText] = useState('');
  const [nextText, setNextText] = useState('');
  const [exitClass, setExitClass] = useState(false);
  const [enterClass, setEnterClass] = useState(false);
  const currentLyricRef = useRef('');

  const config = useOverlayStore(s => s.config) || {};
  const isMoving = useOverlayStore(s => s.isMoving);
  const align = config.textAlign?.lyrics || 'center';
  const flexAlign = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  useEffect(() => {
    const handler = (e) => {
      const { prev, current, next } = e.detail || {};
      const newCurrent = current || '';
      const newPrev = prev || '';
      const newNext = next || '';

      if (window.api?.saveNotes) {
        window.api.saveNotes(`[DISPLAY-LOG] handler received: prev="${newPrev}", current="${newCurrent}", next="${newNext}"`);
      }

      if (currentLyricRef.current !== newCurrent) {
        currentLyricRef.current = newCurrent;
        setExitClass(true);
        setTimeout(() => {
          setCurrentText(newCurrent);
          setPrevText(newPrev);
          setNextText(newNext);
          setExitClass(false);
          setEnterClass(true);
          
          // Use setTimeout instead of requestAnimationFrame to avoid background throttling
          setTimeout(() => {
            setEnterClass(false);
          }, 50);
        }, 200);
      } else {
        // If current hasn't changed but prev or next changed (e.g. initial load or skip)
        setPrevText(newPrev);
        setNextText(newNext);
      }
      
      setLyrics({ prev: newPrev, current: newCurrent, next: newNext });
    };
    window.addEventListener('lyrics-update', handler);
    return () => window.removeEventListener('lyrics-update', handler);
  }, []);

  const hasLyrics = !!(lyrics.prev || lyrics.current || lyrics.next || currentText);
  const showPlaceholder = !hasLyrics && isMoving;
  const isVisible = hasLyrics || isMoving;

  return (
    <DraggableWidget 
      id="comp-lyrics" 
      title="Letras" 
      isGlass={false} 
      noContainer={true} 
      visible={isVisible}
      style={{ 
        minWidth: '200px', 
        minHeight: '60px', 
        position: 'relative', 
        pointerEvents: showPlaceholder ? 'auto' : 'none'
      }}
    >
      <div 
        id="lyrics-container" 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: flexAlign,
          gap: '10px' 
        }}
      >
        {showPlaceholder ? (
          <div 
            className="lyrics-line lyrics-current-line" 
            style={{ 
              textAlign: align, 
              opacity: 0.5, 
              border: '1px dashed var(--accent)',
              borderRadius: '4px',
              padding: '8px'
            }}
          >
            [Letras de Música]
          </div>
        ) : (
          <>
            {prevText && (
              <div id="lyrics-prev" className="lyrics-line lyrics-prev-line" style={{ textAlign: align }}>
                {prevText}
              </div>
            )}
            <div 
              id="lyrics-current" 
              className={`lyrics-line lyrics-current-line ${exitClass ? 'lyrics-exit' : ''} ${enterClass ? 'lyrics-enter' : ''}`}
              style={{ textAlign: align }}
            >
              {currentText}
            </div>
            {nextText && (
              <div id="lyrics-next" className="lyrics-line lyrics-next-line" style={{ textAlign: align }}>
                {nextText}
              </div>
            )}
          </>
        )}
      </div>
    </DraggableWidget>
  );
}
