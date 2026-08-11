'use client'

import { useEffect, useState } from 'react'
import { Clock, LogIn, LogOut } from 'lucide-react'
import { useTodayAttendance, useCheckIn, useCheckOut } from '@/lib/queries/use-attendance'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/utils'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function CheckInOutCard() {
  const { data: today, isLoading } = useTodayAttendance()
  const checkIn = useCheckIn()
  const checkOut = useCheckOut()
  const [elapsed, setElapsed] = useState('00:00:00')

  const checkedIn = !!today?.check_in
  const checkedOut = !!today?.check_out
  const isActive = checkedIn && !checkedOut

  useEffect(() => {
    if (!isActive || !today?.check_in) return

    const start = new Date(today.check_in).getTime()
    const tick = () => setElapsed(formatElapsed(Date.now() - start))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isActive, today?.check_in])

  if (isLoading) return <LoadingSpinner className="py-6" />

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="rounded-full bg-primary/10 p-4 shrink-0">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {!checkedIn && (
              <>
                <p className="text-lg font-semibold">Ready to start your day?</p>
                <p className="text-sm text-muted-foreground">Check in to start tracking your work time</p>
              </>
            )}
            {isActive && (
              <>
                <p className="text-lg font-semibold">Work time started at {formatTime(today!.check_in!)}</p>
                <p className="text-3xl font-bold tabular-nums text-primary mt-1">{elapsed}</p>
                <p className="text-sm text-muted-foreground">Time elapsed since check-in</p>
              </>
            )}
            {checkedIn && checkedOut && (
              <>
                <p className="text-lg font-semibold">
                  Session: {formatTime(today!.check_in!)} – {formatTime(today!.check_out!)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {today!.total_hours != null ? `${today!.total_hours} hours logged today` : 'Hours being calculated...'}
                </p>
              </>
            )}
          </div>
          <div className="shrink-0">
            {!checkedIn && (
              <Button size="lg" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
                <LogIn className="mr-2 h-5 w-5" /> Check In
              </Button>
            )}
            {isActive && (
              <Button size="lg" variant="outline" onClick={() => checkOut.mutate()} disabled={checkOut.isPending}>
                <LogOut className="mr-2 h-5 w-5" /> Check Out
              </Button>
            )}
            {checkedIn && checkedOut && (
              <Badge variant="outline" className="text-green-700 bg-green-50 px-3 py-1.5">
                Day completed
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
