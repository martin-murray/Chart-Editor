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

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  );

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    const newDate = new Date(currentYear, newMonth);
    goToMonth(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    const newDate = new Date(newYear, currentMonth);
    goToMonth(newDate);
  };

  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="flex items-center justify-center gap-2 mb-2"
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
    >
      <select
        value={currentMonth}
        onChange={handleMonthChange}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        className="bg-[#2A2A2A] text-[#f7f7f7] border border-[#474747] rounded px-2 py-1 text-sm cursor-pointer hover:bg-[#333333] focus:outline-none focus:ring-1 focus:ring-[#5AF5FA]"
        style={{ backgroundColor: '#2A2A2A', color: '#f7f7f7' }}
      >
        {months.map((month, index) => (
          <option 
            key={month} 
            value={index}
            style={{ backgroundColor: '#3A3A3A', color: '#f7f7f7' }}
          >
            {month}
          </option>
        ))}
      </select>

      <select
        value={currentYear}
        onChange={handleYearChange}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        className="bg-[#2A2A2A] text-[#f7f7f7] border border-[#474747] rounded px-2 py-1 text-sm cursor-pointer hover:bg-[#333333] focus:outline-none focus:ring-1 focus:ring-[#5AF5FA]"
        style={{ backgroundColor: '#2A2A2A', color: '#f7f7f7' }}
      >
        {years.map((year) => (
          <option 
            key={year} 
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
