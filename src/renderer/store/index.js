import { create } from 'zustand';

export const useOverlayStore = create((set, get) => ({
  config: { layout: { modules: {} } },
  isMoving: false,
  gameName: '',
  timer: { active: false, val: '00:00:00' },
  polls: [],
  scene: { type: 'none', stats: {} }, // 'none', 'starting', 'brb', 'ending'
  
  setConfig: (config) => set({ config }),
  setIsMoving: (isMoving) => set({ isMoving }),
  setGameName: (gameName) => set({ gameName }),
  setTimer: (timer) => set({ timer }),
  setPolls: (polls) => set({ polls }),
  setScene: (scene) => set({ scene }),
}));
