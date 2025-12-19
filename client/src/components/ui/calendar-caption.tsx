import { useId, useMemo } from "react";
import { useNavigation } from "react-day-picker";

interface CalendarCaptionProps {
  displayMonth: Date;
  fromYear?: number;
  toYear?: number;
}

export function CalendarCaption({ displayMonth, fromYear = 2014, toYear = 2024 }: CalendarCaptionProps) {
  const { goToMonth } = useNavigation();
  const currentMonth = displayMonth.getMonth();
  const currentYear = displayMonth.getFullYear();
  
  // Stable IDs to prevent re-mounting of select elements
  const id = useId();
  const monthSelectId = `${id}-month-select`;
  const yearSelectId = `${id}-year-select`;

  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

  const years = useMemo(() => Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  ), [fromYear, toYear]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newMonth = parseInt(e.target.value);
    const newDate = new Date(currentYear, newMonth);
    goToMonth(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newYear = parseInt(e.target.value);
    const newDate = new Date(newYear, currentMonth);
    goToMonth(newDate);
  };

  const stopPropagation = (e: React.MouseEvent | React.TouchEvent | React.FocusEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div 
      className="flex items-center justify-center gap-2 mb-2"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        id={monthSelectId}
        key={monthSelectId}
        value={currentMonth}
        onChange={handleMonthChange}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        className="bg-[#2A2A2A] text-[#f7f7f7] border border-[#474747] rounded px-2 py-1 text-sm cursor-pointer hover:bg-[#333333] focus:outline-none focus:ring-1 focus:ring-[#5AF5FA]"
        style={{ backgroundColor: '#2A2A2A', color: '#f7f7f7' }}
      >
        {months.map((month, index) => (
          <option 
            key={`${monthSelectId}-${index}`} 
            value={index}
            style={{ backgroundColor: '#3A3A3A', color: '#f7f7f7' }}
          >
            {month}
          </option>
        ))}
      </select>

      <select
        id={yearSelectId}
        key={yearSelectId}
        value={currentYear}
        onChange={handleYearChange}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        className="bg-[#2A2A2A] text-[#f7f7f7] border border-[#474747] rounded px-2 py-1 text-sm cursor-pointer hover:bg-[#333333] focus:outline-none focus:ring-1 focus:ring-[#5AF5FA]"
        style={{ backgroundColor: '#2A2A2A', color: '#f7f7f7' }}
      >
        {years.map((year) => (
          <option 
            key={`${yearSelectId}-${year}`} 
            value={year}
            style={{ backgroundColor: '#3A3A3A', color: '#f7f7f7' }}
          >
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
