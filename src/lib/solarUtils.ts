import fs from 'fs';
import path from 'path';
import { THEME_CONSTANTS } from '@/types';

const SOLAR_DATA_PATH = path.join(process.cwd(), 'src/store/solarData.json');
const WARSAW_COORDS = { lat: 52.2297, lng: 21.0122 };

export interface SolarData {
  sunrise: string; // HH:MM (24h)
  sunset: string;
  lastUpdated: string;
}

export async function getSolarTimes(): Promise<SolarData> {
  const globalStore = (global as any);
  
  // 1. Check Memory Cache (Singleton)
  if (globalStore.mockSolarStore) {
    const lastUpdate = new Date(globalStore.mockSolarStore.lastUpdated).getTime();
    const now = new Date().getTime();
    if (now - lastUpdate < THEME_CONSTANTS.SOLAR_REFRESH_DAYS * 24 * 60 * 60 * 1000) {
      return globalStore.mockSolarStore;
    }
  }

  // 2. Check Filesystem Cache
  if (fs.existsSync(SOLAR_DATA_PATH)) {
    try {
      const cached = JSON.parse(fs.readFileSync(SOLAR_DATA_PATH, 'utf-8'));
      const lastUpdate = new Date(cached.lastUpdated).getTime();
      const now = new Date().getTime();

      if (now - lastUpdate < THEME_CONSTANTS.SOLAR_REFRESH_DAYS * 24 * 60 * 60 * 1000) {
        globalStore.mockSolarStore = cached; // Update memory cache
        return cached;
      }
    } catch (e) {
      console.error("Błąd czytania cache słońca:", e);
    }
  }

  // 3. Fetch from API (Sunrise-Sunset.org)
  try {
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${WARSAW_COORDS.lat}&lng=${WARSAW_COORDS.lng}&formatted=0`
    );
    const data = await res.json();

    if (data.status === "OK") {
      const sunriseDate = new Date(data.results.sunrise);
      const sunsetDate = new Date(data.results.sunset);

      const solarData: SolarData = {
        sunrise: sunriseDate.getHours().toString().padStart(2, '0') + ':' + sunriseDate.getMinutes().toString().padStart(2, '0'),
        sunset: sunsetDate.getHours().toString().padStart(2, '0') + ':' + sunsetDate.getMinutes().toString().padStart(2, '0'),
        lastUpdated: new Date().toISOString()
      };

      // Ensure directory exists
      fs.mkdirSync(path.dirname(SOLAR_DATA_PATH), { recursive: true });
      fs.writeFileSync(SOLAR_DATA_PATH, JSON.stringify(solarData, null, 2));
      
      globalStore.mockSolarStore = solarData; // Update memory cache
      return solarData;
    }
  } catch (e) {
    console.error("Błąd pobierania danych słońca:", e);
  }

  // Fallback
  return {
    sunrise: THEME_CONSTANTS.FALLBACK_SUNRISE,
    sunset: THEME_CONSTANTS.FALLBACK_SUNSET,
    lastUpdated: new Date().toISOString()
  };
}
