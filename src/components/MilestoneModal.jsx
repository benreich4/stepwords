import { useEffect, useState } from 'react';

export default function MilestoneModal({ milestone, onClose, lightMode = false }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!milestone) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`relative px-8 py-6 rounded-2xl shadow-2xl backdrop-blur-md border-2 pointer-events-auto transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${
          lightMode
            ? 'bg-white border-yellow-300'
            : 'bg-gray-900 border-yellow-500'
        }`}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{milestone.emoji}</div>
          <div
            className={`text-2xl font-bold mb-2 ${
              lightMode ? 'text-gray-900' : 'text-white'
            }`}
          >
            {milestone.message}
          </div>
          <div
            className={`text-sm ${
              lightMode ? 'text-gray-600' : 'text-gray-300'
            }`}
          >
            Achievement unlocked!
          </div>
        </div>
      </div>
    </div>
  );
}
