import React, { useRef } from 'react';
import { useOverlayStore } from '../../store';
import { useDraggable } from '../hooks/useDraggable';

export function DraggableWidget({ id, title, children, isGlass, noContainer = false, className = '', style = {}, defaultPos = {}, visible = true }) {
  const isMoving = useOverlayStore(state => state.isMoving);
  const elRef = useRef(null);

  const { pos, isVis, align, handleResizerPointerDown } = useDraggable(id, elRef, defaultPos);

  if (!isVis) return null;

  const stylePos = {};
  if (pos.t !== undefined) stylePos.top = pos.t;
  if (pos.l !== undefined) stylePos.left = pos.l;
  if (pos.b !== undefined) stylePos.bottom = pos.b;
  if (pos.r !== undefined) stylePos.right = pos.r;
  if (pos.w !== undefined) stylePos.width = pos.w;
  if (pos.h !== undefined) stylePos.height = pos.h;

  return (
    <div
      ref={elRef}
      id={id}
      className={`drag-item ${visible ? 'visible' : ''} ${noContainer ? '' : (isGlass ? 'glass' : 'solid')} ${className}`}
      data-title={title}
      style={{
        ...style,
        ...stylePos,
        zIndex: pos.z || 10,
        textAlign: align
      }}
    >
      {children}
      {isMoving && <div className="resizer" onPointerDown={handleResizerPointerDown}></div>}
    </div>
  );
}
