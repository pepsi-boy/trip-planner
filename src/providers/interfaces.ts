export interface FareQuote {
  origin: string;
  destination: string;
  cheapest: number;
  cheapestNonstop: number | null;
  currency: string;
}

export interface FlightProvider {
  getFare(origin: string, destination: string, departureDate: string): Promise<FareQuote>;
}

export interface WeatherQuote {
  destination: string;
  temperatureF: number;
}

export interface WeatherProvider {
  getWeather(destination: string, lat: number, lon: number): Promise<WeatherQuote>;
}

export interface NightlifeQuote {
  destination: string;
  venueCount: number;
}

export interface NightlifeProvider {
  getNightlife(destination: string, lat: number, lon: number): Promise<NightlifeQuote>;
}
