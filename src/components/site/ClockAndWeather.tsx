"use client";

import { useState, useEffect } from "react";

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
    <div className="flex flex-col items-end text-sm text-slate-300">
      <div className="font-mono">
        {time.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
      </div>
      <div className="font-mono font-semibold text-white">
        {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      {weather?.temperature != null && (
        <div className="text-red-400 font-medium">
          {Math.round(weather.temperature)}°C — Foz do Iguaçu
        </div>
      )}
    </div>
  );
}
