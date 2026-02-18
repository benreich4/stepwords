import { useMemo } from 'react';
import { ALL_BADGES, FIRST_SOLVE_BADGE, getAchievedBadgesFromStats, getBadgeDisplayInfo } from '../lib/badges.js';

const ALL_ITEMS = [
  { key: 'first-solve', description: FIRST_SOLVE_BADGE.description },
  ...ALL_BADGES,
];

export default function BadgesDisplay({ lightMode = false, compact = false }) {
  const achieved = useMemo(() => getAchievedBadgesFromStats(), []);

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_ITEMS.map((item) => {
        const key = item.key;
        const desc = item.description;
        const isAchieved = achieved.has(key);
        const { emoji: e, color } = getBadgeDisplayInfo(key, isAchieved);
        return (
          <div
            key={key}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border-2 ${
              compact ? 'text-xs' : 'text-sm'
            } ${
              isAchieved
                ? (lightMode ? 'bg-emerald-100 border-emerald-500' : 'bg-emerald-900/40 border-emerald-500')
                : (lightMode ? 'bg-gray-100 border-gray-300 border-dashed' : 'bg-gray-800/30 border-gray-600 border-dashed')
            }`}
            title={desc}
          >
            {isAchieved && <span className={lightMode ? 'text-emerald-600' : 'text-emerald-400'}>✓</span>}
            <span className={isAchieved ? color : 'text-gray-500'}>{e}</span>
            <span className={isAchieved ? (lightMode ? 'text-emerald-900 font-medium' : 'text-emerald-100 font-medium') : (lightMode ? 'text-gray-500' : 'text-gray-500')}>{desc}</span>
          </div>
        );
      })}
    </div>
  );
}
