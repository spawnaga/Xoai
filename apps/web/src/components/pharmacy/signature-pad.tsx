'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface SignaturePadProps {
  onCapture: (signatureData: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  lineColor?: string;
  lineWidth?: number;
  disabled?: boolean;
  label?: string;
  showTimestamp?: boolean;
}

export function SignaturePad({
  onCapture,
  onClear,
  width = 400,
  height = 200,
  lineColor = '#1e293b',
  lineWidth = 2,
  disabled = false,
  label = 'Sign below',
  showTimestamp = true,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Set canvas styles
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Set drawing styles
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height, lineColor, lineWidth]);

  const getCoordinates = useCallback((event: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if ('touches' in event) {
      const touch = event.touches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    if (disabled) return;

    const coords = getCoordinates(event);
    if (!coords) return;

    setIsDrawing(true);
    lastPointRef.current = coords;
  }, [disabled, getCoordinates]);

  const draw = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPointRef.current) return;

    const coords = getCoordinates(event);
    if (!coords) return;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
    setHasSignature(true);
  }, [isDrawing, disabled, getCoordinates]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  // Attach event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => startDrawing(e);
    const handleMouseMove = (e: MouseEvent) => draw(e);
    const handleMouseUp = () => stopDrawing();
    const handleMouseLeave = () => stopDrawing();

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startDrawing(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      draw(e);
    };
    const handleTouchEnd = () => stopDrawing();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startDrawing, draw, stopDrawing]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
    onClear?.();
  };

  const captureSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL('image/png');
    onCapture(signatureData);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {showTimestamp && (
          <span className="text-xs text-slate-500">
            {new Date().toLocaleString()}
          </span>
        )}
      </div>

      <div className={`relative rounded-xl border-2 ${disabled ? 'border-slate-200 bg-slate-50' : 'border-slate-300 bg-white'} overflow-hidden`}>
        <canvas
          ref={canvasRef}
          className={`${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
          style={{ touchAction: 'none' }}
        />

        {/* Signature line */}
        <div className="absolute bottom-8 left-4 right-4 border-b border-dashed border-slate-300" />

        {/* X indicator */}
        <div className="absolute bottom-10 left-4 text-slate-400 text-lg">✗</div>

        {/* Placeholder text */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-400 text-sm">Sign here</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={clearSignature}
          disabled={disabled || !hasSignature}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={captureSignature}
          disabled={disabled || !hasSignature}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed"
        >
          Capture Signature (F7)
        </button>
      </div>

      <p className="text-xs text-slate-500">
        By signing above, I acknowledge receipt of the medication(s) and confirm that counseling was offered.
      </p>
    </div>
  );
}
