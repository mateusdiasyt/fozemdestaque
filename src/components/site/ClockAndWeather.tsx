"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Thermometer } from "lucide-react";

export function ClockAndWeather() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temperature: number | null } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then(setWeather)
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5 text-[#859eac]">
        <Calendar className="w-4 h-4" strokeWidth={2} />
        <span>{time.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</span>
      </div>
      <div className="flex items-center gap-1.5 text-white">
        <Clock className="w-4 h-4 text-[#859eac]" strokeWidth={2} />
        <span className="font-mono tabular-nums">
          {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
      {weather?.temperature != null && (
        <div className="flex items-center gap-1.5 text-[#81d303]">
          <Thermometer className="w-4 h-4" strokeWidth={2} />
          <span className="font-medium">{Math.round(weather.temperature)}°C</span>
        </div>
      )}
    </div>
  );
}
