import React, { useEffect, useRef, useState } from 'react';

export default function Visualizer() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only init if window.api is available
    if (!window.api) return;

    const initAudio = async () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        const sourceId = await window.api.getDesktopAudioId();
        if (audioCtx.state === 'closed') return;
        if (!sourceId) {
          console.warn("[Overlay] No se pudo obtener el ID del escritorio.");
          return;
        }

        const streamOpts = {
          audio: { mandatory: { chromeMediaSource: 'desktop' } },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              minWidth: 128, minHeight: 128, maxWidth: 128, maxHeight: 128
            }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(streamOpts);
        if (audioCtx.state === 'closed') {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        console.log('[Visualizer] Stream acquired:', stream.id);

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;
        console.log('[Visualizer] Audio source connected');

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;

        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        source.connect(analyser);
        analyser.connect(silentGain);
        silentGain.connect(audioCtx.destination);

        setInitialized(true);
      } catch (err) {
        console.warn("[Overlay] Error accediendo a audio para visualizador:", err);
      }
    };

    const unlockAudio = async () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    };
    window.addEventListener('mousedown', unlockAudio);

    initAudio();

    return () => {
      window.removeEventListener('mousedown', unlockAudio);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!initialized || !canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const smoothedArray = new Float32Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const rect = canvas.getBoundingClientRect();
      const targetW = Math.floor(rect.width * 2);
      const targetH = Math.floor(rect.height * 2);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        if (targetW > 0 && targetH > 0) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
      }

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / 2) / (bufferLength * 1.3);
      const gap = barWidth * 0.3;
      const centerY = canvas.height - 10;
      const centerX = canvas.width / 2;

      const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '29, 158, 117'; 

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const isSilent = sum === 0;

      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${accentRgb}, 0.8)`;
      ctx.lineWidth = barWidth;

      for (let i = 0; i < bufferLength; i++) {
        const boost = 1 + (i / bufferLength) * 0.4;
        let target = isSilent ? (5 + Math.random() * 10) : ((dataArray[i] / 255) * canvas.height * 0.85 * boost);

        smoothedArray[i] = smoothedArray[i] * 0.6 + target * 0.4;
        let barHeight = smoothedArray[i];

        if (barHeight > canvas.height - 20) barHeight = canvas.height - 20;
        if (barHeight < 3) barHeight = 3;

        const offset = i * (barWidth + gap) + (gap / 2);
        const rightX = centerX + offset + (barWidth / 2);
        const leftX = centerX - offset - (barWidth / 2);

        const drawPill = (xPos) => {
          ctx.beginPath();
          ctx.moveTo(xPos, centerY);
          ctx.lineTo(xPos, centerY - barHeight);
          ctx.strokeStyle = `rgba(${accentRgb}, ${isSilent ? 0.3 : (dataArray[i] / 255) * 0.6 + 0.4})`;
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(xPos, centerY);
          ctx.lineTo(xPos, centerY - barHeight * 0.75);
          ctx.strokeStyle = `rgba(255,255,255, 0.7)`;
          ctx.lineWidth = barWidth * 0.3;
          ctx.stroke();

          ctx.shadowBlur = 10;
          ctx.lineWidth = barWidth;
        };

        drawPill(rightX);
        drawPill(leftX);
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [initialized]);

  return (
    <canvas 
      id="audio-canvas"
      ref={canvasRef} 
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
