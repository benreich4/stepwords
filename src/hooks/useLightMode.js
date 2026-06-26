import { useEffect, useState } from 'react';
import { getInitialLightMode, readLightMode } from '../lib/theme.js';

export function useLightMode() {
  const [lightMode, setLightMode] = useState(getInitialLightMode);
  useEffect(() => {
    const onSettings = () => {
      try {
        const s = JSON.parse(localStorage.getItem('stepwords-settings') || '{}');
        setLightMode(readLightMode(s));
      } catch {}
    };
    document.addEventListener('stepwords-settings-updated', onSettings);
    return () => document.removeEventListener('stepwords-settings-updated', onSettings);
  }, []);
  return lightMode;
}

export function utilityPageClass(light) {
  return light
    ? 'min-h-screen bg-parchment-100 text-navyink-900'
    : 'min-h-screen bg-navyink-900 text-parchment-50';
}

export function utilityCardClass(light) {
  return light
    ? 'rounded-2xl border border-parchment-200 bg-parchment-50 shadow-card'
    : 'rounded-2xl border border-navyink-700 bg-navyink-800 shadow-card-dark';
}

export function utilityInputClass(light) {
  return light
    ? 'bg-white border-parchment-300 text-navyink-900 focus:border-brand-500 focus:outline-none'
    : 'bg-navyink-850 border-navyink-600 text-parchment-50 focus:border-brand-400 focus:outline-none';
}

export function utilityMutedClass(light) {
  return light ? 'text-navyink-700/65' : 'text-parchment-200/55';
}
