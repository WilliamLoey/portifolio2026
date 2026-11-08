'use client';

import { useEffect, useState } from 'react';

/** Live local time for the hero. Renders nothing on the server to avoid a hydration mismatch. */
export function LocalClock({ timeZone, locale }: { timeZone: string; locale: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="inline-block w-16">&nbsp;</span>;
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone, timeZoneName: 'short' }).format(now);
  return <time dateTime={now.toISOString()} className="tabular-nums">{time}</time>;
}
