import { Check, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorTimeZone } from "@/lib/market-session-time";

/** A day counts as active once the learner reaches the app's 5-minute daily goal. */
const ACTIVE_DAY_SECONDS = 5 * 60;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Summary = {
  daily_activity: { activity_date: string; active_seconds: number }[];
  weekly_total_seconds: number;
  active_days: number;
  current_streak_days: number;
  lessons_completed_this_week: number;
};

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/** The app's Learning Activity view: one circle per weekday, then the week's totals. */
export function LearningActivityCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase
      .rpc("get_learning_activity_summary" as never, { p_timezone: getVisitorTimeZone() } as never)
      .then(({ data, error }) => {
        if (!active) return;
        const row = (Array.isArray(data) ? data[0] : data) as Summary | null | undefined;
        if (error || !row) {
          if (error) console.error("Could not load learning activity:", error);
          setFailed(true);
          return;
        }
        setSummary(row);
      });
    return () => {
      active = false;
    };
  }, []);

  const todayKey = new Date().toLocaleDateString("en-CA");
  const days = summary?.daily_activity ?? [];

  return (
    <div className="card spot activity">
      <div className="between">
        <h2 className="h3">Learning Activity</h2>
        <span className="chip">
          <Flame className="flame" aria-hidden="true" />
          {summary ? `${summary.current_streak_days}-day streak` : "Streak"}
        </span>
      </div>
      {failed ? (
        <p className="small">Your activity appears here once you start learning in the app.</p>
      ) : !summary ? (
        <p className="small">Loading your week…</p>
      ) : (
        <>
          <div className="days" role="list" aria-label="Learning activity this week">
            {days.map((day, i) => {
              const seconds = Number(day.active_seconds) || 0;
              const isToday = day.activity_date === todayKey;
              const isFuture = day.activity_date > todayKey;
              const state =
                seconds >= ACTIVE_DAY_SECONDS
                  ? "done"
                  : seconds > 0
                    ? "some"
                    : isFuture
                      ? "future"
                      : "none";
              return (
                <span
                  className="dcol"
                  role="listitem"
                  key={day.activity_date}
                  aria-label={`${DAY_NAMES[i]}: ${seconds ? `${formatDuration(seconds)} studied` : "no learning activity"}`}
                >
                  <span
                    className={`dc ${state} ${isToday ? "today" : ""}`}
                    style={{ animationDelay: `${0.2 + i * 0.06}s` }}
                  >
                    {state === "done" ? (
                      <Check aria-hidden="true" />
                    ) : (
                      Number(day.activity_date.slice(8, 10))
                    )}
                  </span>
                  <span className={`dl ${isToday ? "today" : ""}`}>{DAY_NAMES[i]}</span>
                </span>
              );
            })}
          </div>
          <hr className="divider" />
          <div className="row" style={{ alignItems: "stretch", gap: 0 }}>
            <div className="metric">
              <b>{formatDuration(summary.weekly_total_seconds)}</b>
              <span className="small">this week</span>
            </div>
            <span className="vdiv" />
            <div className="metric">
              <b>{summary.active_days}</b>
              <span className="small">
                {summary.active_days === 1 ? "active day" : "active days"}
              </span>
            </div>
            <span className="vdiv" />
            <div className="metric">
              <b>{summary.lessons_completed_this_week}</b>
              <span className="small">
                {summary.lessons_completed_this_week === 1
                  ? "lesson completed"
                  : "lessons completed"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
