import React from 'react';
import { blockStore } from '../state/blockStore';
import type { DetoxBlock } from '../state/blockStore';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDays(today: Date): Date[] {
  const days: Date[] = [];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DayScheduleProps {
  dayIndex: number;
  blocks: DetoxBlock[];
}

function blockDisplayTime(block: DetoxBlock): string {
  switch (block.blockingMethod) {
    case 'set-hours':
      return block.setHoursStart && block.setHoursEnd
        ? `${block.setHoursStart} – ${block.setHoursEnd}`
        : 'Set hours';
    case 'duration': {
      const min = block.durationMinutes;
      if (min <= 60) return `${min} min`;
      const h = Math.floor(min / 60);
      const m = min % 60;
      return m === 0 ? `${h} h` : `${h} h ${m} min`;
    }
    case 'usage-limit':
      return `${block.usageLimitMinutes} min/day`;
    case 'launch-count':
      return `${block.launchCountMax} opens/day`;
    default:
      return '';
  }
}

const DaySchedule: React.FC<DayScheduleProps> = ({ dayIndex, blocks }) => {
  const todayIndex = new Date().getDay();
  const relevant = blocks.filter((b) =>
    b.days.length === 0
      ? dayIndex === todayIndex
      : b.days.includes(dayIndex),
  );

  return (
    <div className="day-schedule">
      {relevant.length === 0 ? (
        <p className="day-schedule-empty">No detox blocks scheduled for this day.</p>
      ) : (
        <ul className="day-schedule-list" role="list">
          {relevant.map((block) => (
            <li key={block.id} className={`day-schedule-item${!block.active ? ' day-schedule-item--inactive' : ''}`}>
              <span className="day-schedule-time">
                {blockDisplayTime(block)}
              </span>
              {block.label && <span className="day-schedule-label">{block.label}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface WeekStripProps {
  onDaySelect?: (dayIndex: number) => void;
}

export const WeekStrip: React.FC<WeekStripProps> = ({ onDaySelect }) => {
  const today = new Date();
  const days = getWeekDays(today);
  const monthLabel = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
  const todayDayIndex = today.getDay();

  const [selectedDay, setSelectedDay] = React.useState<number>(todayDayIndex);
  const [blocks, setBlocks] = React.useState<DetoxBlock[]>(blockStore.get().blocks);

  React.useEffect(() => {
    return blockStore.subscribe((next) => setBlocks(next.blocks));
  }, []);

  const handleDayClick = (dayIndex: number) => {
    if (!onDaySelect) return;
    setSelectedDay(dayIndex);
    onDaySelect(dayIndex);
  };

  const interactive = Boolean(onDaySelect);

  return (
    <div className="week-strip-wrapper">
      <p className="week-strip-month">{monthLabel}</p>
      <div className="week-strip" role="list" aria-label="Current week">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const dayIndex = day.getDay();
          const isSelected = interactive && selectedDay === dayIndex && !isToday;
          return (
            <div
              key={day.toISOString()}
              className={[
                'week-day',
                isToday ? 'week-day--today' : '',
                isSelected ? 'week-day--selected' : '',
                interactive ? 'week-day--interactive' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role={interactive ? 'button' : 'listitem'}
              tabIndex={interactive ? 0 : undefined}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={interactive ? selectedDay === dayIndex : undefined}
              onClick={() => handleDayClick(dayIndex)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleDayClick(dayIndex);
              }}
            >
              <span className="week-day-name">{DAY_LABELS[day.getDay()]}</span>
              <span className="week-day-num">{day.getDate()}</span>
            </div>
          );
        })}
      </div>

      {interactive && (
        <DaySchedule dayIndex={selectedDay} blocks={blocks} />
      )}
    </div>
  );
};
