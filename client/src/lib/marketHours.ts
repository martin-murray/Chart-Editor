import { DateTime } from 'luxon';

export interface MarketSession {
  open: string; // HH:mm format in local exchange time
  close: string; // HH:mm format in local exchange time
}

export interface MarketHours {
  timezone: string; // IANA timezone identifier
  sessions: MarketSession[]; // Multiple sessions for markets with lunch breaks
  days: number[]; // Days of week when market is open (1=Monday, 7=Sunday)
  holidays?: string[]; // Optional holiday dates in YYYY-MM-DD format
  halfDays?: { date: string; close: string }[]; // Early close days
}

export interface MarketStatus {
  isOpen: boolean;
  nextTransition: DateTime;
  nextTransitionType: 'open' | 'close';
  currentSessionClose?: DateTime;
  formattedCountdown: string;
  marketHoursGMT: string;
}

export function computeMarketStatus(marketHours: MarketHours): MarketStatus {
  const now = DateTime.now().setZone('UTC');
  const exchangeNow = now.setZone(marketHours.timezone);
  
  // Check if today is a trading day
  const isWeekend = !marketHours.days.includes(exchangeNow.weekday);
  
  // Check for holidays (simple implementation - can be enhanced later)
  const todayStr = exchangeNow.toISODate() || '';
  const isHoliday = marketHours.holidays?.includes(todayStr) || false;
  
  if (isWeekend || isHoliday) {
    // Market is closed, find next trading day
    let nextTradingDay = exchangeNow.plus({ days: 1 });
    while (!marketHours.days.includes(nextTradingDay.weekday) || 
           (marketHours.holidays && marketHours.holidays.includes(nextTradingDay.toISODate() || ''))) {
      nextTradingDay = nextTradingDay.plus({ days: 1 });
    }
    
    const nextOpen = nextTradingDay.set({
      hour: parseInt(marketHours.sessions[0].open.split(':')[0]),
      minute: parseInt(marketHours.sessions[0].open.split(':')[1]),
      second: 0,
      millisecond: 0
    });
    
    const countdown = formatCountdown(now, nextOpen.toUTC());
    const dayName = nextOpen.toFormat('ccc');
    const timeGMT = nextOpen.toUTC().toFormat('HH:mm');
    
    return {
      isOpen: false,
      nextTransition: nextOpen.toUTC(),
      nextTransitionType: 'open',
      formattedCountdown: `Opens in ${countdown} (${dayName} ${timeGMT} GMT)`,
      marketHoursGMT: formatMarketHoursGMT(marketHours)
    };
  }
  
  // Check current status during trading day
  const currentTime = exchangeNow.toFormat('HH:mm');
  let isCurrentlyOpen = false;
  let currentSessionClose: DateTime | undefined;
  let nextTransition: DateTime;
  let nextTransitionType: 'open' | 'close';
  
  // Check if we're in any trading session
  for (const session of marketHours.sessions) {
    if (currentTime >= session.open && currentTime < session.close) {
      isCurrentlyOpen = true;
      currentSessionClose = exchangeNow.set({
        hour: parseInt(session.close.split(':')[0]),
        minute: parseInt(session.close.split(':')[1]),
        second: 0,
        millisecond: 0
      });
      break;
    }
  }
  
  if (isCurrentlyOpen && currentSessionClose) {
    // Market is open, show countdown to close
    nextTransition = currentSessionClose.toUTC();
    nextTransitionType = 'close';
  } else {
    // Market is closed, find next session today or tomorrow
    let nextOpenTime: DateTime | null = null;
    
    // Check remaining sessions today
    for (const session of marketHours.sessions) {
      if (currentTime < session.open) {
        nextOpenTime = exchangeNow.set({
          hour: parseInt(session.open.split(':')[0]),
          minute: parseInt(session.open.split(':')[1]),
          second: 0,
          millisecond: 0
        });
        break;
      }
    }
    
    // If no more sessions today, get first session tomorrow
    if (!nextOpenTime) {
      let nextTradingDay = exchangeNow.plus({ days: 1 });
      while (!marketHours.days.includes(nextTradingDay.weekday) || 
             (marketHours.holidays && marketHours.holidays.includes(nextTradingDay.toISODate() || ''))) {
        nextTradingDay = nextTradingDay.plus({ days: 1 });
      }
      
      nextOpenTime = nextTradingDay.set({
        hour: parseInt(marketHours.sessions[0].open.split(':')[0]),
        minute: parseInt(marketHours.sessions[0].open.split(':')[1]),
        second: 0,
        millisecond: 0
      });
    }
    
    nextTransition = nextOpenTime.toUTC();
    nextTransitionType = 'open';
  }
  
  const countdown = formatCountdown(now, nextTransition);
  const actionText = nextTransitionType === 'close' ? 'Closes' : 'Opens';
  const timeInfo = nextTransitionType === 'open' && !nextTransition.hasSame(now, 'day') 
    ? ` (${nextTransition.toFormat('ccc HH:mm')} GMT)`
    : '';
  
  return {
    isOpen: isCurrentlyOpen,
    nextTransition,
    nextTransitionType,
    currentSessionClose,
    formattedCountdown: `${actionText} in ${countdown}${timeInfo}`,
    marketHoursGMT: formatMarketHoursGMT(marketHours)
  };
}

function formatCountdown(now: DateTime, target: DateTime): string {
  const diff = target.diff(now, ['hours', 'minutes', 'seconds']);
  const hours = Math.floor(diff.hours);
  const minutes = Math.floor(diff.minutes);
  const seconds = Math.floor(diff.seconds);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function formatMarketHoursGMT(marketHours: MarketHours): string {
  const sampleDate = DateTime.now().setZone(marketHours.timezone);
  
  const sessions = marketHours.sessions.map(session => {
    const openLocal = sampleDate.set({
      hour: parseInt(session.open.split(':')[0]),
      minute: parseInt(session.open.split(':')[1])
    });
    const closeLocal = sampleDate.set({
      hour: parseInt(session.close.split(':')[0]),
      minute: parseInt(session.close.split(':')[1])
    });
    
    const openGMT = openLocal.toUTC().toFormat('HH:mm');
    const closeGMT = closeLocal.toUTC().toFormat('HH:mm');
    
    return `${openGMT}–${closeGMT}`;
  });
  
  if (sessions.length === 1) {
    return `Market hours (GMT): ${sessions[0]}`;
  } else {
    return `Market hours (GMT): ${sessions.join(', ')}`;
  }
}