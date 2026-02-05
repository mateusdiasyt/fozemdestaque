import { NextResponse } from "next/server";

const LAT = process.env.NEXT_PUBLIC_WEATHER_LAT || "-25.5478";
const LON = process.env.NEXT_PUBLIC_WEATHER_LON || "-54.5882";

export async function GET() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    const temp = data?.current?.temperature_2m ?? null;
    return NextResponse.json({ temperature: temp, unit: "°C" });
  } catch {
    return NextResponse.json({ temperature: null });
  }
}
