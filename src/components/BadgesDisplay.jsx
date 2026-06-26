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
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
              compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'
            } ${
              isAchieved
                ? (lightMode ? 'bg-emerald-50 border-emerald-400' : 'bg-emerald-900/30 border-emerald-500/70')
                : (lightMode ? 'bg-parchment-100 border-parchment-300 border-dashed' : 'bg-navyink-850 border-navyink-600 border-dashed')
            }`}
            title={desc}
          >
            <span className={isAchieved ? color : (lightMode ? 'text-navyink-700/40' : 'text-parchment-200/35')}>{e}</span>
            <span className={isAchieved ? (lightMode ? 'text-emerald-800 font-medium' : 'text-emerald-100 font-medium') : (lightMode ? 'text-navyink-700/55' : 'text-parchment-200/45')}>{desc}</span>
          </div>
        );
      })}
    </div>
  );
}
