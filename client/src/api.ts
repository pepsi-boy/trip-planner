const BASE = import.meta.env.VITE_API_URL ?? '';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Trip { id: string; name: string; created_at: string }
export interface Member {
  id: string; trip_id: string; name: string; home_airport: string;
}
export interface Preferences {
  budget: number; weather_weight: number; nightlife_weight: number; preferred_temp_f: number;
}
export interface Destination { iata: string; city: string; lat: number; lon: number; nightlife_score: number }

export interface MemberScore { memberId: string; memberName: string; fare: number; score: number; affordable: boolean }
export interface RankedDestination {
  iata: string; city: string; fare: number; temperatureF: number; nightlifeScore: number;
  memberScores: MemberScore[]; groupWeightedAvg: number; groupMaxMin: number;
}
export interface ScoreResponse {
  strategy_note: string;
  ranked_by_weighted_avg: RankedDestination[];
  ranked_by_max_min: RankedDestination[];
}

export const api = {
  getTrips: () => req<Trip[]>('GET', '/trips'),
  createTrip: (name: string) => req<Trip>('POST', '/trips', { name }),
  getTrip: (id: string) => req<Trip & { members: (Member & Partial<Preferences>)[] }>('GET', `/trips/${id}`),
  addMember: (tripId: string, name: string, home_airport: string) =>
    req<Member>('POST', `/trips/${tripId}/members`, { name, home_airport }),
  deleteMember: (tripId: string, memberId: string) =>
    req<void>('DELETE', `/trips/${tripId}/members/${memberId}`),
  upsertPrefs: (tripId: string, memberId: string, prefs: Preferences) =>
    req<Preferences>('PUT', `/trips/${tripId}/members/${memberId}/preferences`, prefs),
  getDestinations: () => req<Destination[]>('GET', '/destinations'),
  score: (tripId: string, destinations: string[], departure_date: string) =>
    req<ScoreResponse>('POST', `/trips/${tripId}/score`, { destinations, departure_date }),
};
