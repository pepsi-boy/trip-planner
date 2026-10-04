import type { WeatherProvider, WeatherQuote } from '../interfaces';
import { TokenBucket } from '../../lib/tokenBucket';
import { Cache } from '../../lib/cache';

const FIFTEEN_MIN = 15 * 60 * 1000;

export class OpenMeteoWeatherProvider implements WeatherProvider {
  private bucket = new TokenBucket(10, 2);
  private cache = new Cache<WeatherQuote>(FIFTEEN_MIN);

  async getWeather(destination: string, lat: number, lon: number): Promise<WeatherQuote> {
    const cached = this.cache.get(destination);
    if (cached) return cached;

    if (!this.bucket.consume()) throw new Error('open-meteo rate limit exceeded');

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m&temperature_unit=fahrenheit&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);

    const data = (await res.json()) as { current: { temperature_2m: number } };
    const quote: WeatherQuote = { destination, temperatureF: data.current.temperature_2m };
    this.cache.set(destination, quote);
    return quote;
  }
}
