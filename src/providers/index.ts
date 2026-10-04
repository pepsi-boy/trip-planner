import { FixtureFlightProvider } from './flight/fixture';
import { IgnavFlightProvider } from './flight/ignav';
import { OpenMeteoWeatherProvider } from './weather/openmeteo';
import { GeoapifyNightlifeProvider } from './nightlife/geoapify';
import { StaticNightlifeProvider } from './nightlife/static';
import type { FlightProvider, WeatherProvider, NightlifeProvider } from './interfaces';

// Use fixture flight provider unless IGNAV_LIVE=true is explicitly set.
// This protects the 1,000-request free tier during dev and tests.
export const flightProvider: FlightProvider = process.env['IGNAV_LIVE'] === 'true'
  ? new IgnavFlightProvider(process.env['IGNAV_API_KEY'] ?? '')
  : new FixtureFlightProvider();

export const weatherProvider: WeatherProvider = new OpenMeteoWeatherProvider();

export const nightlifeProvider: NightlifeProvider = process.env['GEOAPIFY_API_KEY']
  ? new GeoapifyNightlifeProvider(process.env['GEOAPIFY_API_KEY'])
  : new StaticNightlifeProvider();
