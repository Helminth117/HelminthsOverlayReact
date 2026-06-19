import React, { useEffect, useState, useRef } from 'react';
import { useOverlayStore } from '../../store';
import { DraggableWidget } from './DraggableWidget';

// Shop configuration
const SHOP_ITEMS = {
  lentes: { id: 'lentes', name: 'Lentes Oscuros', cost: 150, label: '🕶️ Lentes' },
  gorra: { id: 'gorra', name: 'Gorra Flama', cost: 250, label: '🧢 Gorra' },
  auriculares: { id: 'auriculares', name: 'Audífonos Gamer', cost: 300, label: '🎧 Audífonos' },
  mascara: { id: 'mascara', name: 'Máscara Ninja', cost: 400, label: '🥷 Máscara' },
  escudo: { id: 'escudo', name: 'Escudo Vikingo', cost: 500, label: '🛡️ Escudo' },
  halo: { id: 'halo', name: 'Halo de Ángel', cost: 600, label: '😇 Halo' },
  espada: { id: 'espada', name: 'Espada de Luz', cost: 850, label: '⚔️ Espada' },
  alas: { id: 'alas', name: 'Alas de Fénix', cost: 1200, label: '🪶 Alas' },
  corona: { id: 'corona', name: 'Corona Real', cost: 2000, label: '👑 Corona' },
  aura: { id: 'aura', name: 'Aura Cósmica', cost: 3500, label: '✨ Aura' }
};

// Helper function to dynamically lighten/darken color for 3D gradient shading
const adjustBrightness = (hex, percent) => {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt((R * (100 + percent)) / 100);
  G = parseInt((G * (100 + percent)) / 100);
  B = parseInt((B * (100 + percent)) / 100);

  R = R < 255 ? (R > 0 ? R : 0) : 255;
  G = G < 255 ? (G > 0 ? G : 0) : 255;
  B = B < 255 ? (B > 0 ? B : 0) : 255;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

// Hash function to assign consistent user avatar colors
const getUsernameColor = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', 
    '#eab308', '#84cc16', '#22c55e', '#10b981', '#06b6d4', 
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'
  ];
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

// Hash function to assign consistent user avatar shapes (0: blocky, 1: chubby blob, 2: tall)
const getUsernameShape = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 3;
};

// Procedural SVG Sprite Component
const AvatarSprite = ({ color, username, equipped, action, isDancing, frame, direction, bobYOverride }) => {
  const bodyShape = getUsernameShape(username);
  
  // Dynamic shading gradients based on base color
  const colorDark = adjustBrightness(color, -25);
  const colorLight = adjustBrightness(color, 25);
  const gradId = `body-grad-${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // Minor bounce animation inside the SVG when walking/dancing
  const bobY = bobYOverride !== undefined 
    ? bobYOverride 
    : (isDancing 
        ? (frame % 2 === 0 ? -10 : -2) 
        : (action === 'walk' ? (frame % 2 === 0 ? -2 : 0) : 0));
    
  const leftLegY = action === 'walk' ? (frame % 4 < 2 ? 2.5 : 0) : 0;
  const rightLegY = action === 'walk' ? (frame % 4 >= 2 ? 2.5 : 0) : 0;

  const hasItem = (itemId) => equipped.includes(itemId);

  // Dynamic waddle wiggling angle when walking
  const waddleAngle = action === 'walk' ? (frame % 4 < 2 ? -4 : 4) : 0;

  // Head items vertical offset depending on shape height
  // Shape 0: Normal (top = 8), Shape 1: Chubby (top = 9), Shape 2: Tall (top = 6)
  let headYOffset = 0;
  if (bodyShape === 1) headYOffset = 1.2;
  if (bodyShape === 2) headYOffset = -2;

  // Coordinates for eyes/mouth based on shape
  let eyeY = 11.5;
  let mouthY = 15;
  
  if (bodyShape === 1) {
    eyeY = 12.5;
    mouthY = 16;
  } else if (bodyShape === 2) {
    eyeY = 10;
    mouthY = 13.5;
  }

  // Cheek blush coordinates
  const cheekY = eyeY + 1.8;
  const cheekL = bodyShape === 2 ? 8.2 : 7.2;
  const cheekR = bodyShape === 2 ? 13.6 : 14.6;

  // Blinking cycle on normal action
  const isBlinking = frame === 0 && action !== 'fall' && action !== 'jump' && !isDancing;

  // Animated arms logic (swings opposite to waddle, waves on dance, panic on fall)
  let leftArmRot = 0;
  let rightArmRot = 0;
  
  if (isDancing) {
    leftArmRot = frame % 2 === 0 ? -45 : 15;
    rightArmRot = frame % 2 === 0 ? 15 : -45;
  } else if (action === 'walk') {
    leftArmRot = Math.sin(frame * 0.8) * 25;
    rightArmRot = -Math.sin(frame * 0.8) * 25;
  } else if (action === 'fall') {
    leftArmRot = -130;
    rightArmRot = -130;
  } else if (action === 'jump') {
    leftArmRot = -110;
    rightArmRot = -110;
  } else {
    leftArmRot = Math.sin(frame * 0.4) * 5;
    rightArmRot = -Math.sin(frame * 0.4) * 5;
  }

  // Arm positions based on shape
  let leftArmX = 4.2;
  let rightArmX = 18.0;
  let armY = 11.5;
  
  if (bodyShape === 1) {
    leftArmX = 3.4;
    rightArmX = 18.8;
    armY = 12.5;
  } else if (bodyShape === 2) {
    leftArmX = 5.4;
    rightArmX = 16.8;
    armY = 9.5;
  }

  return (
    <svg 
      width="48" 
      height="48" 
      viewBox="0 0 24 24" 
      style={{ 
        overflow: 'visible',
        transform: direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
        transition: 'transform 0.2s ease'
      }}
    >
      <defs>
        {/* Cosmic Aura Gradient */}
        <radialGradient id="aura-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.75" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>

        {/* Dynamic 3D Shading Gradient */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colorLight} />
          <stop offset="60%" stopColor={color} />
          <stop offset="100%" stopColor={colorDark} />
        </linearGradient>

        {/* Gold crown gradient */}
        <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Lightsaber glowing blade gradient */}
        <linearGradient id="laser-grad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>

        {/* Phoenix wings gradient */}
        <linearGradient id="phoenix-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse 
        cx="12" 
        cy="21.5" 
        rx={isDancing ? (frame % 2 === 0 ? "4.5" : "5.5") : "5"} 
        ry="1.1" 
        fill="rgba(0, 0, 0, 0.18)" 
      />

      {/* Cosmic Aura Behind Body */}
      {hasItem('aura') && (
        <circle 
          cx="12" 
          cy={12 + bobY} 
          r="12" 
          fill="url(#aura-grad)" 
          style={{ transformOrigin: '12px 12px' }}
        />
      )}

      {/* Wings Behind Body */}
      {hasItem('alas') && (
        <g style={{ transform: `translate(0px, ${bobY}px)` }}>
          {/* Left Wing */}
          <path 
            d="M 6 12 C 2 8, 0 12, 3 16 C 4 17, 5 15, 6 12 Z" 
            fill="url(#phoenix-grad)" 
            style={{ 
              transform: `rotate(${action === 'walk' ? Math.sin(frame * 1.5) * 12 : 0}deg)`,
              transformOrigin: '6px 12px'
            }} 
          />
          {/* Right Wing */}
          <path 
            d="M 18 12 C 22 8, 24 12, 21 16 C 20 17, 19 15, 18 12 Z" 
            fill="url(#phoenix-grad)" 
            style={{ 
              transform: `rotate(${action === 'walk' ? -Math.sin(frame * 1.5) * 12 : 0}deg)`,
              transformOrigin: '18px 12px'
            }} 
          />
        </g>
      )}

      {/* Legs (Drawn under body) */}
      <g fill="#374151">
        {/* Left Leg */}
        <rect x={bodyShape === 2 ? 8.5 : 8} y={bodyShape === 2 ? 19 + leftLegY : 18.5 + leftLegY} width="2.2" height="3.5" rx="0.5" />
        {/* Right Leg */}
        <rect x={bodyShape === 2 ? 13 : 13.5} y={bodyShape === 2 ? 19 + rightLegY : 18.5 + rightLegY} width="2.2" height="3.5" rx="0.5" />
      </g>

      {/* Left Arm (Behind body shape) */}
      <g style={{ 
        transform: `translate(0px, ${bobY}px) rotate(${waddleAngle}deg)`,
        transformOrigin: '12px 16px' 
      }}>
        <rect 
          x={leftArmX} 
          y={armY} 
          width="1.8" 
          height="5.2" 
          rx="0.9" 
          fill={colorDark} 
          stroke="#1f2937" 
          strokeWidth="0.5"
          style={{ 
            transform: `rotate(${leftArmRot}deg)`,
            transformOrigin: `${leftArmX + 0.9}px ${armY + 0.9}px`,
            transition: 'transform 0.15s ease'
          }} 
        />
      </g>

      {/* Main Body (Bobbing & Waddle tilting) */}
      <g style={{ 
        transform: `translate(0px, ${bobY}px) rotate(${waddleAngle}deg)`,
        transformOrigin: '12px 16px' 
      }}>
        
        {/* Procedural Body Shapes with dynamic color gradients */}
        {bodyShape === 0 && (
          /* Shape 0: Classic Blocky Robot */
          <>
            <rect x="6" y="8" width="12" height="12" rx="3.2" fill={`url(#${gradId})`} stroke="#1f2937" strokeWidth="0.8" />
            <rect x="7.5" y="9.5" width="9" height="9" rx="1.5" fill="rgba(255,255,255,0.14)" />
          </>
        )}

        {bodyShape === 1 && (
          /* Shape 1: Chubby Blob */
          <>
            <rect x="5.2" y="9.2" width="13.6" height="10.8" rx="4.8" fill={`url(#${gradId})`} stroke="#1f2937" strokeWidth="0.8" />
            <rect x="6.8" y="10.8" width="10.4" height="7.6" rx="2.5" fill="rgba(255,255,255,0.14)" />
          </>
        )}

        {bodyShape === 2 && (
          /* Shape 2: Tall Cylindrical Box */
          <>
            <rect x="7.2" y="5.8" width="9.6" height="14.4" rx="3.5" fill={`url(#${gradId})`} stroke="#1f2937" strokeWidth="0.8" />
            <rect x="8.5" y="7.2" width="7" height="11.6" rx="1.8" fill="rgba(255,255,255,0.14)" />
          </>
        )}

        {/* Rosy Blush Cheeks (Extremely cute!) */}
        <g fill="#ff5e7e" opacity="0.65">
          <circle cx={cheekL} cy={cheekY} r="0.7" />
          <circle cx={cheekR} cy={cheekY} r="0.7" />
        </g>

        {/* EYES (Based on emotional action states) */}
        {action === 'fall' ? (
          /* 1. Dizzy Cross Eyes (Falling panic) */
          <g stroke="#111827" strokeWidth="0.85" strokeLinecap="round">
            <line x1="8.5" y1={eyeY - 1} x2="10.5" y2={eyeY + 1} />
            <line x1="10.5" y1={eyeY - 1} x2="8.5" y2={eyeY + 1} />
            <line x1="13.5" y1={eyeY - 1} x2="15.5" y2={eyeY + 1} />
            <line x1="15.5" y1={eyeY - 1} x2="13.5" y2={eyeY + 1} />
          </g>
        ) : action === 'jump' ? (
          /* 2. Happy Arch Eyes (Jumping "Weee!") */
          <g stroke="#111827" strokeWidth="1" fill="none" strokeLinecap="round">
            <path d={`M 8.2 ${eyeY + 0.5} Q 9.5 ${eyeY - 1.2} 10.8 ${eyeY + 0.5}`} />
            <path d={`M 13.2 ${eyeY + 0.5} Q 14.5 ${eyeY - 1.2} 15.8 ${eyeY + 0.5}`} />
          </g>
        ) : isDancing ? (
          /* 3. Squeezed Horizontal Eyes (Dancing joy) */
          <g stroke="#111827" strokeWidth="1.2" strokeLinecap="round">
            <line x1="8.2" y1={eyeY} x2="10.8" y2={eyeY} />
            <line x1="13.2" y1={eyeY} x2="15.8" y2={eyeY} />
          </g>
        ) : isBlinking ? (
          /* 4. Closed Blinking Eyes (Occasional idle blink) */
          <g fill="#111827">
            <rect x="8.5" y={eyeY + 0.3} width="2.5" height="0.6" />
            <rect x="13" y={eyeY + 0.3} width="2.5" height="0.6" />
          </g>
        ) : (
          /* 5. Standard Cute Eyes (Idle / Walking) */
          <g fill="#111827">
            <rect x="8.5" y={eyeY - 1} width="2.2" height="2.2" rx="0.3" />
            <rect x="13.3" y={eyeY - 1} width="2.2" height="2.2" rx="0.3" />
          </g>
        )}

        {/* MOUTH (Based on emotional action states) */}
        {action === 'fall' ? (
          /* Squiggly Worry Mouth */
          <path 
            d={`M 10 ${mouthY} Q 11 ${mouthY - 1} 12 ${mouthY} Q 13 ${mouthY + 1} 14 ${mouthY}`} 
            stroke="#111827" 
            strokeWidth="0.8" 
            fill="none" 
            strokeLinecap="round" 
          />
        ) : action === 'jump' ? (
          /* Open Shouting Circle Mouth */
          <circle cx="12" cy={mouthY + 0.2} r="1.5" fill="#111827" />
        ) : isDancing ? (
          /* Big Happy Grin Open Mouth */
          <path 
            d={`M 10.2 ${mouthY - 0.5} Q 12 ${mouthY + 2.5} 13.8 ${mouthY - 0.5} Z`} 
            fill="#f43f5e" 
            stroke="#111827" 
            strokeWidth="0.8" 
          />
        ) : (
          /* Standard Cute Happy Smile */
          <path 
            d={`M 10.5 ${mouthY} Q 12 ${mouthY + 1.2} 13.5 ${mouthY}`} 
            stroke="#111827" 
            strokeWidth="0.9" 
            fill="none" 
            strokeLinecap="round" 
          />
        )}

        {/* ACCESSORIES (Aligned vertically using headYOffset) */}
        {/* Sunglasses */}
        {hasItem('lentes') && (
          <g fill="#1f2937">
            <rect x="7.8" y={eyeY - 1.2} width="3.8" height="2.2" rx="0.5" />
            <rect x="12.4" y={eyeY - 1.2} width="3.8" height="2.2" rx="0.5" />
            <rect x="11.4" y={eyeY - 0.7} width="1.2" height="0.6" />
          </g>
        )}

        {/* Ninja Mask */}
        {hasItem('mascara') && (
          <rect 
            x="5.5" 
            y={mouthY - 1.8} 
            width="13" 
            height="7" 
            rx="1" 
            fill="#1f2937" 
            style={{ transform: `translateY(${headYOffset * 0.4}px)` }}
          />
        )}

        {/* Cap */}
        {hasItem('gorra') && (
          <g fill="#3b82f6" style={{ transform: `translateY(${headYOffset}px)` }}>
            <path d="M 6 8.5 C 6 5.2, 18 5.2, 18 8.5 Z" />
            <path d="M 16 8 L 21.2 8 C 21.2 8.5, 20.2 9.2, 16 9.2 Z" />
            <circle cx="12" cy="5.2" r="0.8" fill="#fbbf24" />
          </g>
        )}

        {/* Audífonos Gamer (Headphones) */}
        {hasItem('auriculares') && (
          <g style={{ transform: `translateY(${headYOffset}px)` }}>
            {/* Band */}
            <path d="M 5.8 11 A 6.5 6.5 0 0 1 18.2 11" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
            {/* Left Cup */}
            <rect x="4.8" y="9.5" width="2" height="4.5" rx="1" fill="#111827" stroke="#10b981" strokeWidth="0.5" />
            {/* Right Cup */}
            <rect x="17.2" y="9.5" width="2" height="4.5" rx="1" fill="#111827" stroke="#10b981" strokeWidth="0.5" />
          </g>
        )}

        {/* Crown */}
        {hasItem('corona') && (
          <path 
            d="M 6 8.5 L 6 3.8 L 9 6.2 L 12 2.8 L 15 6.2 L 18 3.8 L 18 8.5 Z" 
            fill="url(#gold-grad)" 
            stroke="#b45309" 
            strokeWidth="0.5" 
            style={{ transform: `translateY(${headYOffset}px)` }}
          />
        )}

        {/* Angel Halo (Floating) */}
        {hasItem('halo') && (
          <ellipse 
            cx="12" 
            cy="4" 
            rx="5.2" 
            ry="1.2" 
            fill="none" 
            stroke="#fbbf24" 
            strokeWidth="0.8" 
            style={{ 
              filter: 'drop-shadow(0 0 2px #fbbf24)',
              transform: `translateY(${headYOffset - 2.5}px)`
            }} 
          />
        )}

        {/* Shield (Held by left arm / side) */}
        {hasItem('escudo') && (
          <g style={{ 
            transform: `translate(${leftArmX - 0.4}px, ${armY + 1.2}px) rotate(${leftArmRot - 15}deg)`,
            transformOrigin: '0px 0px'
          }}>
            <circle cx="0" cy="0" r="4.2" fill="#b91c1c" stroke="#374151" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="2.5" fill="url(#gold-grad)" />
            <polygon points="0,-1.5 0.5,-0.3 1.6,-0.3 0.8,0.4 1.1,1.5 0,0.8 -1.1,1.5 -0.8,0.4 -1.6,-0.3 -0.5,-0.3" fill="#ffffff" />
          </g>
        )}

        {/* Sword (Held by right arm / side) */}
        {hasItem('espada') && (
          <g style={{ 
            transform: `translate(${rightArmX + 0.9}px, ${armY + 1.2}px) rotate(${rightArmRot + 25}deg)`,
            transformOrigin: '0.9px 4px'
          }}>
            <rect x="0" y="-8" width="1.8" height="9" rx="0.5" fill="url(#laser-grad)" stroke="#0284c7" strokeWidth="0.4" />
            <rect x="-1.5" y="1" width="4.8" height="1.2" rx="0.2" fill="#fbbf24" />
            <rect x="0" y="2.2" width="1.8" height="2.5" rx="0.2" fill="#78350f" />
          </g>
        )}

        {/* Right Arm (In front of body and weapons) */}
        <rect 
          x={rightArmX} 
          y={armY} 
          width="1.8" 
          height="5.2" 
          rx="0.9" 
          fill={colorDark} 
          stroke="#1f2937" 
          strokeWidth="0.5"
          style={{ 
            transform: `rotate(${rightArmRot}deg)`,
            transformOrigin: `${rightArmX + 0.9}px ${armY + 0.9}px`,
            transition: 'transform 0.15s ease'
          }} 
        />
      </g>
    </svg>
  );
};

export default function ChatAvatars() {
  const [avatars, setAvatars] = useState([]);
  const [particles, setParticles] = useState([]);
  const [frame, setFrame] = useState(0);
  const isMoving = useOverlayStore(s => s.isMoving);
  const config = useOverlayStore(s => s.config) || {};

  // Store user database in localStorage
  const userDatabaseRef = useRef({});

  // Initialize DB from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tiktok_avatars_db');
      if (stored) {
        userDatabaseRef.current = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load avatars DB:', e);
    }
  }, []);

  const saveDatabase = () => {
    try {
      localStorage.setItem('tiktok_avatars_db', JSON.stringify(userDatabaseRef.current));
    } catch (e) {
      console.error('Failed to save avatars DB:', e);
    }
  };

  const getUserData = (username) => {
    const key = username.toLowerCase().trim();
    if (!userDatabaseRef.current[key]) {
      userDatabaseRef.current[key] = {
        username: username,
        points: 100,
        likes: 0,
        inventory: [],
        equipped: []
      };
      saveDatabase();
    }
    return userDatabaseRef.current[key];
  };

  const updateUserData = (username, updater) => {
    const key = username.toLowerCase().trim();
    const currentData = getUserData(username);
    const updated = { ...currentData, ...updater(currentData) };
    userDatabaseRef.current[key] = updated;
    saveDatabase();
    return updated;
  };

  // Tick frame animation cycle (blinking & waddling frames)
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % 16);
    }, 120);
    return () => clearInterval(timer);
  }, []);

  // Helper to spawn emoji particles bursting from a widget
  const triggerEmojiParticles = (widgetId, customEmojis) => {
    const el = document.getElementById(widgetId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const widgetBottom = rect.bottom;
    const widgetWidth = rect.width;
    const widgetLeft = rect.left;

    const emojis = customEmojis || ['⭐', '❤️', '🔥', '✨', '🎉', '⚡', '💥', '🎈'];
    const newParticles = [];
    
    // Spawn 3 to 5 particles
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Math.random().toString(),
        char: emojis[Math.floor(Math.random() * emojis.length)],
        x: widgetLeft + (widgetWidth * 0.15) + Math.random() * (widgetWidth * 0.7),
        y: widgetBottom - 10
      });
    }

    setParticles(prev => [...prev, ...newParticles]);

    // Clean up particles after animation completes (1.2s)
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1300);
  };

  // Platform physics engine helper functions
  const findPlatformUnderAvatar = (avX, y, prevY, floorRect) => {
    const dragItems = document.querySelectorAll('.drag-item');
    let highestPlatform = null;
    let highestTop = -1;

    dragItems.forEach(el => {
      // Ignore itself, visualizer (which is a trampoline), and hidden widgets
      if (el.id === 'comp-chat-avatars' || el.id === 'comp-visualizer' || el.classList.contains('hidden') || el.style.display === 'none') return;
      
      const rect = el.getBoundingClientRect();
      if (avX >= rect.left && avX <= rect.right) {
        const platformTop = floorRect.bottom - rect.top;
        // Check if the feet cross the top boundary from above
        if (prevY >= platformTop - 1 && y <= platformTop + 4) {
          if (platformTop > highestTop) {
            highestTop = platformTop;
            highestPlatform = { id: el.id, top: platformTop };
          }
        }
      }
    });

    return highestPlatform;
  };

  const checkPlatformStillActive = (av, floorRect) => {
    if (!av.platformId) return false;
    const el = document.getElementById(av.platformId);
    if (!el || el.classList.contains('hidden') || el.style.display === 'none') return false;

    const rect = el.getBoundingClientRect();
    const avX = floorRect.left + (av.x / 100) * floorRect.width;

    // Small boundary margin so they don't fall off on the exact pixel edge
    const padding = 10;
    if (avX >= rect.left - padding && avX <= rect.right + padding) {
      return floorRect.bottom - rect.top;
    }
    return false;
  };

  const getPlatformHorizontalBounds = (platformId, floorRect) => {
    const el = document.getElementById(platformId);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const minX = ((rect.left - floorRect.left) / floorRect.width) * 100;
    const maxX = ((rect.right - floorRect.left) / floorRect.width) * 100;
    return { minX: Math.max(2, minX), maxX: Math.min(98, maxX) };
  };

  // Helper to check and trigger headbutt jump if avatar walks under a widget
  const checkWidgetCollisionAndHeadbutt = (av) => {
    if (av.isDancing || av.action === 'jump' || av.action === 'fall') return null;
    if (Math.random() > 0.05) return null; // 5% chance per tick

    const floorEl = document.getElementById('comp-chat-avatars');
    if (!floorEl) return null;
    const floorRect = floorEl.getBoundingClientRect();

    const avX = floorRect.left + (av.x / 100) * floorRect.width;
    const dragItems = document.querySelectorAll('.drag-item');
    let closestWidget = null;
    let minDistanceY = Infinity;

    dragItems.forEach(el => {
      if (el.id === 'comp-chat-avatars' || el.id === 'comp-visualizer' || el.classList.contains('hidden') || el.style.display === 'none') return;
      const rect = el.getBoundingClientRect();
      
      if (avX >= rect.left && avX <= rect.right) {
        const widgetBottom = floorRect.bottom - rect.bottom;
        const avHeadY = av.y + 40; // top head height
        const distY = widgetBottom - avHeadY;
        
        // Target widgets above the head (up to 320px high)
        if (distY > 15 && distY < minDistanceY && distY < 320) {
          closestWidget = { id: el.id, distY };
          minDistanceY = distY;
        }
      }
    });

    if (closestWidget) {
      // Calculate precise velocity to reach distY height (gravity is 0.65)
      // v0 = sqrt(2 * g * H)
      const H = closestWidget.distY;
      const initialVy = Math.sqrt(2 * 0.65 * H) + 0.3;

      return {
        action: 'jump',
        vy: Math.max(6, Math.min(22, initialVy)),
        jumpWidgetId: closestWidget.id,
        hasBumped: false
      };
    }
    return null;
  };

  // Sync avatar positions, actions, jumps, falls, platform walking and trampoline bounces
  useEffect(() => {
    const moveTimer = setInterval(() => {
      setAvatars(prev => {
        const now = Date.now();
        const floorEl = document.getElementById('comp-chat-avatars');
        if (!floorEl) return prev;
        const floorRect = floorEl.getBoundingClientRect();

        return prev
          .map((av) => {
            // Inactivity timeout: 5 mins
            if (!isMoving && now - av.lastActive > 300000) {
              return null;
            }

            let { x, y, vy, targetX, speed, direction, action, isDancing, danceTimer, platformId } = av;

            // --- 0. PLATFORM ADHESION SYNC ---
            if (platformId && action !== 'fall' && action !== 'jump') {
              const platformTop = checkPlatformStillActive(av, floorRect);
              if (platformTop !== false) {
                y = platformTop;
                vy = 0;
              } else {
                // Walked off or platform moved away!
                platformId = undefined;
                action = 'fall';
                vy = 0;
              }
            }

            // --- 1. FALLING STATE (Gravity & Platform / Trampoline check) ---
            if (action === 'fall') {
              const prevY = y;
              vy -= 0.65; // gravity pulling down
              y += vy;

              // Check collision with the Visualizer (comp-visualizer) acting as a Trampoline
              const visEl = document.getElementById('comp-visualizer');
              if (visEl && !visEl.classList.contains('hidden') && visEl.style.display !== 'none') {
                const visRect = visEl.getBoundingClientRect();
                const avX = floorRect.left + (x / 100) * floorRect.width;

                if (avX >= visRect.left && avX <= visRect.right) {
                  const visTopHeight = floorRect.bottom - visRect.top;
                  if (vy < 0 && y <= visTopHeight && prevY >= visTopHeight) {
                    // TRAMPOLINE LAUNCH BOUNCE!
                    y = visTopHeight + 2;
                    vy = 14.5; // launch velocity
                    triggerEmojiParticles('comp-visualizer', ['🎵', '🎶', '✨', '⚡', '🔊']);
                    const driftDir = Math.random() > 0.5 ? 2.5 : -2.5;
                    targetX = Math.max(5, Math.min(95, x + driftDir * 12));
                    return {
                      ...av,
                      y,
                      vy,
                      targetX,
                      action: 'fall',
                      platformId: undefined
                    };
                  }
                }
              }

              // Check landing on other platforms
              if (vy < 0) {
                const avX = floorRect.left + (x / 100) * floorRect.width;
                const platform = findPlatformUnderAvatar(avX, y, prevY, floorRect);
                if (platform) {
                  y = platform.top;
                  vy = 0;
                  action = 'walk';
                  platformId = platform.id;
                  return {
                    ...av,
                    y,
                    vy,
                    action,
                    platformId
                  };
                }
              }

              // Reached floor
              if (y <= 0) {
                y = 0;
                vy = 0;
                action = 'idle';
                targetX = 5 + Math.random() * 90;
                platformId = undefined;
              }

              return {
                ...av,
                y,
                vy,
                action,
                targetX,
                platformId
              };
            }

            // --- 2. JUMPING STATE (Headbutting / platform landing) ---
            if (action === 'jump') {
              let { jumpWidgetId, hasBumped } = av;
              const prevY = y;
              vy -= 0.65;
              y += vy;

              // At peak/rising of jump and hasn't bumped yet
              if (vy <= 0 && !hasBumped && jumpWidgetId) {
                hasBumped = true;
                triggerEmojiParticles(jumpWidgetId);
              }

              // Check platform landing on descent
              if (vy < 0) {
                const avX = floorRect.left + (x / 100) * floorRect.width;
                const platform = findPlatformUnderAvatar(avX, y, prevY, floorRect);
                if (platform) {
                  y = platform.top;
                  vy = 0;
                  action = 'walk';
                  platformId = platform.id;
                  return {
                    ...av,
                    y,
                    vy,
                    action,
                    platformId,
                    jumpWidgetId: undefined,
                    hasBumped: undefined
                  };
                }
              }

              // Reached floor
              if (y <= 0) {
                y = 0;
                vy = 0;
                action = 'walk';
                platformId = undefined;
                return {
                  ...av,
                  y,
                  vy,
                  action,
                  platformId,
                  jumpWidgetId: undefined,
                  hasBumped: undefined
                };
              }

              return {
                ...av,
                y,
                vy,
                hasBumped
              };
            }

            // --- 3. DANCING STATE ---
            if (isDancing) {
              danceTimer -= 50;
              if (danceTimer <= 0) {
                isDancing = false;
                action = 'idle';
                y = platformId ? y : 0;
              } else {
                // bob Y slightly based on dancer Y
                const baseHeight = platformId ? y : 0;
                y = baseHeight + (frame % 2 === 0 ? 8 : 0);
              }
              return {
                ...av,
                isDancing,
                danceTimer,
                action,
                y
              };
            }

            // --- 4. WALKING & IDLE STATE MACHINE ---
            const dist = targetX - x;
            if (Math.abs(dist) < 1.2) {
              x = targetX;
              
              if (Math.random() < 0.25) {
                action = 'idle';
                if (platformId) {
                  const bounds = getPlatformHorizontalBounds(platformId, floorRect);
                  if (bounds && Math.random() < 0.75) {
                    // Prefer staying on platform
                    targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
                  } else {
                    targetX = 5 + Math.random() * 90;
                  }
                } else {
                  targetX = 5 + Math.random() * 90;
                }
              } else {
                action = 'walk';
                if (platformId) {
                  const bounds = getPlatformHorizontalBounds(platformId, floorRect);
                  if (bounds && Math.random() < 0.75) {
                    targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
                  } else {
                    targetX = 5 + Math.random() * 90;
                  }
                } else {
                  targetX = 5 + Math.random() * 90;
                }
                direction = targetX > x ? 'right' : 'left';
              }
            } else {
              action = 'walk';
              x += dist > 0 ? speed : -speed;
              
              // Occasional jump check
              const jumpActionDetail = checkWidgetCollisionAndHeadbutt(av);
              if (jumpActionDetail) {
                return {
                  ...av,
                  ...jumpActionDetail
                };
              }
            }

            return {
              ...av,
              x,
              targetX,
              direction,
              action,
              platformId
            };
          })
          .filter(Boolean);
      });
    }, 50);

    return () => clearInterval(moveTimer);
  }, [isMoving, frame]);

  // Handle incoming TikTok Live events
  useEffect(() => {
    if (!window.api) return;

    // Helper to trigger actions on user avatar
    const triggerUserAvatar = (username, speechBubble = '', pointsBonus = 0, spawnFromSky = false, likesBonus = 0) => {
      const dbUser = updateUserData(username, u => ({
        points: u.points + pointsBonus,
        likes: (u.likes || 0) + likesBonus
      }));

      setAvatars(prev => {
        const index = prev.findIndex(a => a.user.toLowerCase() === username.toLowerCase());
        const now = Date.now();
        const speechDetail = speechBubble ? {
          message: speechBubble,
          messageTime: now + 6000 // display speech bubble for 6 seconds
        } : {};

        if (index >= 0) {
          // Update existing avatar
          const updated = [...prev];
          
          // If user is currently on the floor/platform, occasionally give them a jump
          let extraAction = {};
          if ((updated[index].y === 0 || updated[index].platformId) && updated[index].action !== 'jump' && Math.random() < 0.15) {
            extraAction = {
              action: 'jump',
              vy: 7.5,
              hasBumped: true // don't headbutt on random chat jumps
            };
          }

          updated[index] = {
            ...updated[index],
            ...speechDetail,
            ...extraAction,
            equipped: dbUser.equipped,
            lastActive: now
          };
          return updated;
        } else {
          // Spawn new avatar dropping from the sky!
          let spawnY = 0;
          if (spawnFromSky) {
            const floorEl = document.getElementById('comp-chat-avatars');
            const lineTopEl = document.getElementById('line-top');
            if (floorEl && lineTopEl) {
              const floorRect = floorEl.getBoundingClientRect();
              const lineTopRect = lineTopEl.getBoundingClientRect();
              spawnY = Math.max(150, floorRect.bottom - lineTopRect.top);
            } else {
              spawnY = window.innerHeight * 0.75;
            }
          }
          const newAvatar = {
            user: username,
            color: getUsernameColor(username),
            x: 10 + Math.random() * 80,
            y: spawnY,
            vy: 0,
            targetX: 10 + Math.random() * 80,
            speed: 0.3 + Math.random() * 0.4,
            direction: Math.random() > 0.5 ? 'right' : 'left',
            action: spawnFromSky ? 'fall' : 'idle',
            lastActive: now,
            isDancing: false,
            danceTimer: 0,
            equipped: dbUser.equipped,
            platformId: undefined,
            ...speechDetail
          };
          return [...prev, newAvatar];
        }
      });
    };

    // Chat Event
    const handleChat = (data) => {
      const { user, text } = data || {};
      if (!user) return;

      const trimmedText = text.trim();
      const commandParts = trimmedText.split(' ');
      const command = commandParts[0].toLowerCase();
      let responseMsg = '';

      if (command.startsWith('!')) {
        // --- PROCESS COMMANDS ---
        if (command === '!puntos' || command === '!points') {
          const dbUser = getUserData(user);
          responseMsg = `Tengo ${dbUser.points} puntos y he enviado ${dbUser.likes || 0} likes! 💰❤️`;
        } else if (command === '!likes') {
          const dbUser = getUserData(user);
          responseMsg = `He enviado ${dbUser.likes || 0} likes! ❤️`;
        } else if (command === '!tienda' || command === '!shop') {
          responseMsg = `Tienda: lentes (150), gorra (250), audifonos (300), mascara (400), escudo (500), halo (600), espada (850), alas (1200), corona (2000), aura (3500). Compra con !comprar <nombre>`;
        } else if (command === '!comprar' || command === '!buy') {
          let itemKey = commandParts[1]?.toLowerCase();
          if (itemKey === 'audis' || itemKey === 'audifonos' || itemKey === 'auris') itemKey = 'auriculares';
          if (itemKey === 'shield') itemKey = 'escudo';
          const item = SHOP_ITEMS[itemKey];

          if (!itemKey) {
            responseMsg = `Especifica el accesorio, ej: !comprar gorra`;
          } else if (!item) {
            responseMsg = `Ese accesorio no existe en la tienda.`;
          } else {
            const dbUser = getUserData(user);
            if (dbUser.inventory.includes(itemKey)) {
              responseMsg = `Ya tienes ${item.name}! Equípalo con !equipar ${itemKey}`;
            } else if (dbUser.points < item.cost) {
              responseMsg = `Me faltan puntos para comprar ${item.name} (cuesta ${item.cost} pts, tengo ${dbUser.points})`;
            } else {
              // Deduct points, add to inventory and equip
              updateUserData(user, u => ({
                points: u.points - item.cost,
                inventory: [...u.inventory, itemKey],
                equipped: u.equipped.includes(itemKey) ? u.equipped : [...u.equipped, itemKey]
              }));
              responseMsg = `Comprado y equipado: ${item.name}! 🛍️`;
            }
          }
        } else if (command === '!equipar' || command === '!equip') {
          let itemKey = commandParts[1]?.toLowerCase();
          if (itemKey === 'audis' || itemKey === 'audifonos' || itemKey === 'auris') itemKey = 'auriculares';
          if (itemKey === 'shield') itemKey = 'escudo';

          if (!itemKey) {
            responseMsg = `Especifica el accesorio a equipar.`;
          } else {
            const dbUser = getUserData(user);
            if (!dbUser.inventory.includes(itemKey)) {
              responseMsg = `No tienes el accesorio ${itemKey}. Cómpralo con !comprar ${itemKey}`;
            } else if (dbUser.equipped.includes(itemKey)) {
              responseMsg = `Ya tienes equipado ${itemKey}.`;
            } else {
              updateUserData(user, u => ({
                equipped: [...u.equipped, itemKey]
              }));
              responseMsg = `Equipado: ${itemKey}! ✨`;
            }
          }
        } else if (command === '!desequipar' || command === '!unequip') {
          let itemKey = commandParts[1]?.toLowerCase();
          if (itemKey === 'audis' || itemKey === 'audifonos' || itemKey === 'auris') itemKey = 'auriculares';
          if (itemKey === 'shield') itemKey = 'escudo';

          if (!itemKey) {
            responseMsg = `Especifica qué quitarte.`;
          } else {
            const dbUser = getUserData(user);
            if (!dbUser.equipped.includes(itemKey)) {
              responseMsg = `No tienes equipado ${itemKey}.`;
            } else {
              updateUserData(user, u => ({
                equipped: u.equipped.filter(i => i !== itemKey)
              }));
              responseMsg = `Me quité: ${itemKey}.`;
            }
          }
        } else if (command === '!bailar' || command === '!dance') {
          responseMsg = `¡A bailar! 💃🕺`;
          // Trigger dance mode
          setAvatars(prev => {
            return prev.map(a => {
              if (a.user.toLowerCase() === user.toLowerCase()) {
                return {
                  ...a,
                  isDancing: true,
                  danceTimer: 5000 // dance for 5 seconds
                };
              }
              return a;
            });
          });
        }
      } else {
        // Standard chat message
        responseMsg = trimmedText;
      }

      // Spawn or update avatar and award active chat points (+15 points), drop from sky if spawning new
      triggerUserAvatar(user, responseMsg, 15, true);
    };

    // Likes Event
    const handleLike = (data) => {
      const { user, count } = data || {};
      if (!user) return;
      const pts = (count || 1) * 8;
      
      const dbUser = getUserData(user);
      const newTotalLikes = (dbUser.likes || 0) + (count || 1);

      // Spawn on floor (don't drop from sky for continuous simple likes)
      triggerUserAvatar(user, `Envió ${count} Likes! ❤️`, pts, false, (count || 1));
    };

    // Follow / Gift Alerts Event
    const handleStreamAlert = (data) => {
      if (!data) return;
      const { type, user, gift, count } = data;
      if (!user) return;

      if (type === 'follow') {
        // Award follow bonus points (+150 pts), drop from sky
        triggerUserAvatar(user, `¡Seguí al streamer! 🎉`, 150, true);
      } else if (type === 'gift') {
        const coins = count || 1;
        const totalBonus = coins * 100;
        const cleanGift = gift.toLowerCase();
        let autoUnlockMsg = '';

        // Drop from sky on gift donations!
        triggerUserAvatar(user, `¡Regaló ${gift} x${count}! 🎁`, totalBonus, true);

        // Auto-equip special matching skins if they send particular gifts
        if (cleanGift.includes('rose') || cleanGift.includes('rosa')) {
          updateUserData(user, u => {
            const inv = u.inventory.includes('halo') ? u.inventory : [...u.inventory, 'halo'];
            const eq = u.equipped.includes('halo') ? u.equipped : [...u.equipped, 'halo'];
            return { inventory: inv, equipped: eq };
          });
          autoUnlockMsg = `¡Desbloqueó el Halo de Ángel! 😇`;
        } else if (cleanGift.includes('cap') || cleanGift.includes('gorra') || cleanGift.includes('sombrero')) {
          updateUserData(user, u => {
            const inv = u.inventory.includes('gorra') ? u.inventory : [...u.inventory, 'gorra'];
            const eq = u.equipped.includes('gorra') ? u.equipped : [...u.equipped, 'gorra'];
            return { inventory: inv, equipped: eq };
          });
          autoUnlockMsg = `¡Desbloqueó la Gorra Flama! 🧢`;
        } else if (cleanGift.includes('crown') || cleanGift.includes('corona')) {
          updateUserData(user, u => {
            const inv = u.inventory.includes('corona') ? u.inventory : [...u.inventory, 'corona'];
            const eq = u.equipped.includes('corona') ? u.equipped : [...u.equipped, 'corona'];
            return { inventory: inv, equipped: eq };
          });
          autoUnlockMsg = `¡Desbloqueó la Corona Real! 👑`;
        }

        if (autoUnlockMsg) {
          setTimeout(() => {
            triggerUserAvatar(user, autoUnlockMsg, 0, false);
          }, 3000);
        }
      }
    };

    const chatUnsub = window.api.on('tiktok-chat', handleChat);
    const likeUnsub = window.api.on('tiktok-like', handleLike);
    const alertUnsub = window.api.on('stream-alert', handleStreamAlert);

    return () => {
      window.api.off('tiktok-chat', chatUnsub);
      window.api.off('tiktok-like', likeUnsub);
      window.api.off('stream-alert', alertUnsub);
    };
  }, []);

  const now = Date.now();
  const visibleAvatars = isMoving 
    ? [
        { user: 'Chatter1', color: '#3b82f6', x: 25, y: 0, direction: 'right', action: 'walk', equipped: ['gorra', 'escudo'], lastActive: now },
        { user: 'Chatter2', color: '#ec4899', x: 50, y: 0, direction: 'left', action: 'idle', equipped: ['lentes', 'alas', 'auriculares'], lastActive: now },
        { user: 'Chatter3', color: '#10b981', x: 75, y: 0, direction: 'right', action: 'idle', equipped: ['corona', 'espada', 'aura'], lastActive: now }
      ]
    : avatars;

  const hasAvatars = visibleAvatars.length > 0;
  const showPlaceholder = !hasAvatars && isMoving;
  const isVisible = hasAvatars || isMoving;

  return (
    <DraggableWidget 
      id="comp-chat-avatars" 
      title="Avatares del Chat" 
      isGlass={false} 
      noContainer={true} 
      visible={isVisible}
      defaultPos={{ b: '0px', l: '0px', w: '100%', h: '110px' }}
      style={{ 
        width: '100%', 
        height: '110px', 
        position: 'relative', 
        overflow: 'visible',
        pointerEvents: showPlaceholder ? 'auto' : 'none'
      }}
    >
      <div className="avatars-floor-container">
        {showPlaceholder ? (
          <div 
            style={{ 
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--accent)',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            Avatares del Chat (Arrastra aquí)
          </div>
        ) : (
          visibleAvatars.map((av, idx) => {
            const hasBubble = av.message && av.messageTime > now;
            return (
              <div 
                key={idx} 
                className="avatar-wrapper"
                style={{ 
                  left: `${av.x}%`,
                  bottom: `${av.y || 0}px`
                }}
              >
                {/* Speech Bubble */}
                {hasBubble && (
                  <div className="avatar-speech-bubble">
                    {av.message}
                  </div>
                )}

                {/* Vector Avatar */}
                <AvatarSprite 
                  color={av.color} 
                  username={av.user}
                  equipped={av.equipped || []} 
                  action={av.action} 
                  isDancing={av.isDancing}
                  frame={frame}
                  direction={av.direction}
                  bobYOverride={av.bobY}
                />

                {/* Nickname plate */}
                <div 
                  className="avatar-name"
                  style={{
                    borderColor: av.color || '#ffffff',
                    boxShadow: `0 4px 12px rgba(0, 0, 0, 0.75), 0 0 8px ${(av.color || '#ffffff')}55`
                  }}
                >
                  {av.user}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Sparkle Particles */}
      {particles.map(p => (
        <span
          key={p.id}
          style={{
            position: 'fixed',
            left: p.x,
            top: p.y,
            fontSize: '20px',
            pointerEvents: 'none',
            animation: 'float-up-fade 1.2s ease-out forwards',
            zIndex: 9999
          }}
        >
          {p.char}
        </span>
      ))}
    </DraggableWidget>
  );
}
