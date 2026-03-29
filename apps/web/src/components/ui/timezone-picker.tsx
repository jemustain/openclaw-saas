'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

/**
 * Get the UTC offset string for a timezone, e.g. "UTC-07:00"
 */
function getUtcOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    // "GMT-7" -> "UTC-07:00"
    const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (match) {
      const sign = match[1];
      const hours = match[2].padStart(2, '0');
      const minutes = match[3] ?? '00';
      return `UTC${sign}${hours}:${minutes}`;
    }
    if (offset === 'GMT') return 'UTC+00:00';
    return offset;
  } catch {
    return '';
  }
}

/**
 * Get numeric offset in minutes for sorting
 */
function getOffsetMinutes(tz: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    return (local.getTime() - utc.getTime()) / 60000;
  } catch {
    return 0;
  }
}

/**
 * Build the full timezone list from Intl.supportedValuesOf
 */
function buildTimezoneList(): { value: string; label: string; offset: string; offsetMin: number }[] {
  let allZones: string[];
  try {
    allZones = (Intl as any).supportedValuesOf('timeZone');
  } catch {
    // Fallback for older browsers
    allZones = [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
      'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
      'Australia/Sydney', 'Pacific/Auckland',
    ];
  }

  return allZones
    .map((tz) => {
      const offset = getUtcOffset(tz);
      const offsetMin = getOffsetMinutes(tz);
      // "America/New_York" -> "America/New York"
      const display = tz.replace(/_/g, ' ');
      return {
        value: tz,
        label: `(${offset}) ${display}`,
        offset,
        offsetMin,
      };
    })
    .sort((a, b) => a.offsetMin - b.offsetMin);
}

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
  className?: string;
}

export function TimezonePicker({ value, onChange, className }: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const timezones = useMemo(() => buildTimezoneList(), []);

  const filtered = useMemo(() => {
    if (!search) return timezones;
    const q = search.toLowerCase();
    return timezones.filter(
      (tz) =>
        tz.value.toLowerCase().includes(q) ||
        tz.label.toLowerCase().includes(q),
    );
  }, [search, timezones]);

  const selectedLabel = useMemo(() => {
    const found = timezones.find((tz) => tz.value === value);
    return found?.label ?? value;
  }, [value, timezones]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Scroll selected into view when opened
  useEffect(() => {
    if (open && listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white text-left flex items-center justify-between hover:border-slate-600 transition"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-xl max-h-72 flex flex-col">
          <div className="p-2 border-b border-slate-700">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezone..."
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div ref={listRef} className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">No timezones found</div>
            ) : (
              filtered.map((tz) => (
                <button
                  key={tz.value}
                  type="button"
                  data-selected={tz.value === value}
                  onClick={() => {
                    onChange(tz.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    tz.value === value
                      ? 'bg-violet-600/20 text-violet-300'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {tz.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
