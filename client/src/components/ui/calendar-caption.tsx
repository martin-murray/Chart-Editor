import * as React from "react"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useNavigation } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CalendarCaptionProps {
  displayMonth: Date
  fromYear?: number
  toYear?: number
}

export function CalendarCaption({ 
  displayMonth,
  fromYear,
  toYear 
}: CalendarCaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()
  
  // Calculate year range
  const currentYear = new Date().getFullYear()
  const startYear = fromYear || currentYear - 10
  const endYear = toYear || currentYear
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => endYear - i
  )

  const handleYearSelect = (year: string) => {
    const newDate = new Date(displayMonth)
    newDate.setFullYear(parseInt(year))
    goToMonth(newDate)
  }

  const handleMonthSelect = (month: string) => {
    const newDate = new Date(displayMonth)
    newDate.setMonth(parseInt(month))
    goToMonth(newDate)
  }

  return (
    <div className="flex justify-center pt-1 relative items-center px-1">
      {/* Previous Month Button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          if (previousMonth) {
            goToMonth(previousMonth)
          }
        }}
        disabled={!previousMonth}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1",
          !previousMonth && "opacity-30 cursor-not-allowed"
        )}
        type="button"
        aria-label="Go to previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Month and Year Selectors */}
      <div className="flex items-center gap-1">
        {/* Month Selector */}
        <Select
          value={displayMonth.getMonth().toString()}
          onValueChange={handleMonthSelect}
        >
          <SelectTrigger className="h-7 w-auto min-w-[100px] text-sm font-medium border-0 bg-transparent hover:bg-accent focus:ring-0 focus:ring-offset-0 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]" style={{ backgroundColor: '#3A3A3A' }}>
            {Array.from({ length: 12 }, (_, i) => {
              const monthDate = new Date(2024, i, 1)
              return (
                <SelectItem key={i} value={i.toString()}>
                  {format(monthDate, "MMMM")}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {/* Year Selector */}
        <Select
          value={displayMonth.getFullYear().toString()}
          onValueChange={handleYearSelect}
        >
          <SelectTrigger className="h-7 w-auto min-w-[70px] text-sm font-medium border-0 bg-transparent hover:bg-accent focus:ring-0 focus:ring-offset-0 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]" style={{ backgroundColor: '#3A3A3A' }}>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Next Month Button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          if (nextMonth) {
            goToMonth(nextMonth)
          }
        }}
        disabled={!nextMonth}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1",
          !nextMonth && "opacity-30 cursor-not-allowed"
        )}
        type="button"
        aria-label="Go to next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}