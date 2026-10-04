import { useState, useEffect, useCallback } from 'react';
import { api, type Trip, type Member, type Destination, type RankedDestination, type Preferences } from './api';

type Step = 'trip' | 'members' | 'score';
type MemberWithPrefs = Member & Partial<Preferences>;

const today = new Date().toISOString().slice(0, 10);

function Badge({ ok }: { ok: boolean }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: ok ? '#166534' : '#7f1d1d', color: '#fff' }}>
      {ok ? 'affordable' : 'over budget'}
    </span>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>('trip');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<MemberWithPrefs[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [depDate, setDepDate] = useState(today);
  const [results, setResults] = useState<RankedDestination[] | null>(null);
  const [strategy, setStrategy] = useState<'avg' | 'maxmin'>('avg');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newTripName, setNewTripName] = useState('');
  const [newName, setNewName] = useState('');
  const [newAirport, setNewAirport] = useState('');
  const [newBudget, setNewBudget] = useState('500');
  const [newTemp, setNewTemp] = useState('72');
  const [newWeather, setNewWeather] = useState('0.5');
  const [newNightlife, setNewNightlife] = useState('0.5');

  useEffect(() => {
    api.getTrips().then(setTrips).catch(() => {});
    api.getDestinations().then(setDestinations).catch(() => {});
  }, []);

  const loadTrip = useCallback(async (t: Trip) => {
    const full = await api.getTrip(t.id);
    setTrip(t);
    setMembers(full.members);
    setStep('members');
    setResults(null);
  }, []);

  const createTrip = async () => {
    if (!newTripName.trim()) return;
    setError('');
    try {
      const t = await api.createTrip(newTripName.trim());
      setTrips(prev => [t, ...prev]);
      setNewTripName('');
      await loadTrip(t);
    } catch (e) { setError(String(e)); }
  };

  const addMember = async () => {
    if (!trip || !newName.trim() || newAirport.length !== 3) return;
    setError('');
    try {
      const m = await api.addMember(trip.id, newName.trim(), newAirport.toUpperCase());
      await api.upsertPrefs(trip.id, m.id, {
        budget: Number(newBudget),
        weather_weight: Number(newWeather),
        nightlife_weight: Number(newNightlife),
        preferred_temp_f: Number(newTemp),
      });
      const full = await api.getTrip(trip.id);
      setMembers(full.members);
      setNewName(''); setNewAirport('');
    } catch (e) { setError(String(e)); }
  };

  const removeMember = async (memberId: string) => {
    if (!trip) return;
    await api.deleteMember(trip.id, memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const runScore = async () => {
    if (!trip || selected.size === 0) return;
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await api.score(trip.id, [...selected], depDate);
      setResults(res.ranked_by_weighted_avg);
      setStrategy('avg');
      setStep('score');
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const ranked = results
    ? (strategy === 'avg'
        ? [...results].sort((a, b) => b.groupWeightedAvg - a.groupWeightedAvg)
        : [...results].sort((a, b) => b.groupMaxMin - a.groupMaxMin))
    : [];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 820, margin: '0 auto', padding: '32px 16px', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Group Trip Planner</h1>
      <p style={{ color: '#94a3b8', marginBottom: 32 }}>Find the destination your whole group will love.</p>

      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {/* Step 1: Trip */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeader}>1. Trip</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Trip name (e.g. Spring Break 2027)"
            value={newTripName}
            onChange={e => setNewTripName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTrip()}
            style={inputStyle}
          />
          <button onClick={createTrip} style={btnStyle}>Create</button>
        </div>
        {trips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {trips.map(t => (
              <button key={t.id} onClick={() => loadTrip(t)}
                style={{ ...btnStyle, background: trip?.id === t.id ? '#1d4ed8' : '#1e293b', fontSize: 13 }}>
                {t.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Step 2: Members */}
      {(step === 'members' || step === 'score') && trip && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionHeader}>2. Members -- {trip.name}</h2>

          {members.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{ background: '#1e293b', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <strong>{m.name}</strong>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>
                      {' '}{m.home_airport} | ${m.budget ?? '--'} | {m.preferred_temp_f ?? '--'}°F | weather {m.weather_weight ?? '--'} | nightlife {m.nightlife_weight ?? '--'}
                    </span>
                  </span>
                  <button onClick={() => removeMember(m.id)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>x</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 8 }}>
            {([
              { label: 'Name', value: newName, onChange: setNewName, props: {} },
              { label: 'Home airport', value: newAirport, onChange: (v: string) => setNewAirport(v.toUpperCase()), props: { maxLength: 3 } },
              { label: 'Budget (USD)', value: newBudget, onChange: setNewBudget, props: { type: 'number' } },
              { label: 'Ideal temp (°F)', value: newTemp, onChange: setNewTemp, props: { type: 'number' } },
              { label: 'Weather weight', value: newWeather, onChange: setNewWeather, props: { type: 'number', step: '0.1', min: '0', max: '1' } },
              { label: 'Nightlife weight', value: newNightlife, onChange: setNewNightlife, props: { type: 'number', step: '0.1', min: '0', max: '1' } },
            ] as const).map(field => (
              <div key={field.label}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{field.label}</div>
                <input value={field.value} onChange={e => (field.onChange as (v: string) => void)(e.target.value)} style={inputStyle} {...field.props} />
              </div>
            ))}
          </div>
          <button onClick={addMember} style={btnStyle}>Add Member</button>
        </section>
      )}

      {/* Step 3: Score */}
      {(step === 'members' || step === 'score') && members.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionHeader}>3. Score Destinations</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {destinations.map(d => (
              <label key={d.iata} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: selected.has(d.iata) ? '#1e3a5f' : '#1e293b',
                padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                border: selected.has(d.iata) ? '1px solid #3b82f6' : '1px solid transparent',
              }}>
                <input type="checkbox" checked={selected.has(d.iata)}
                  onChange={e => setSelected(prev => {
                    const s = new Set(prev);
                    e.target.checked ? s.add(d.iata) : s.delete(d.iata);
                    return s;
                  })}
                  style={{ accentColor: '#3b82f6' }} />
                <span style={{ fontSize: 13 }}>{d.iata} <span style={{ color: '#64748b' }}>{d.city}</span></span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <label style={{ color: '#94a3b8', fontSize: 13 }}>Departure</label>
            <input type="date" value={depDate} onChange={e => setDepDate(e.target.value)}
              style={{ ...inputStyle, width: 160 }} />
          </div>
          <button onClick={runScore} disabled={loading || selected.size === 0}
            style={{ ...btnStyle, background: '#2563eb', opacity: loading || selected.size === 0 ? 0.5 : 1 }}>
            {loading ? 'Scoring...' : 'Find Best Destinations'}
          </button>
        </section>
      )}

      {/* Results */}
      {step === 'score' && ranked.length > 0 && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={sectionHeader}>Results</h2>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setStrategy('avg')}
                style={{ ...btnStyle, fontSize: 12, background: strategy === 'avg' ? '#1d4ed8' : '#1e293b' }}>
                Weighted avg
              </button>
              <button onClick={() => setStrategy('maxmin')}
                style={{ ...btnStyle, fontSize: 12, background: strategy === 'maxmin' ? '#1d4ed8' : '#1e293b' }}>
                Max-min
              </button>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
            {strategy === 'avg'
              ? 'Ranked by average score -- maximises total group happiness.'
              : 'Ranked by lowest individual score -- protects the least happy person.'}
          </p>
          {ranked.map((r, i) => (
            <div key={r.iata} style={{
              background: '#1e293b', borderRadius: 8, padding: 16, marginBottom: 12,
              borderLeft: i === 0 ? '3px solid #3b82f6' : '3px solid #334155',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>
                  {i + 1}. {r.city} <span style={{ color: '#64748b', fontWeight: 400 }}>({r.iata})</span>
                </span>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>
                  ${r.fare} | {r.temperatureF}°F | nightlife {r.nightlifeScore}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>
                  Group avg <strong style={{ color: '#e2e8f0' }}>{r.groupWeightedAvg}</strong>
                </span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>
                  Max-min <strong style={{ color: '#e2e8f0' }}>{r.groupMaxMin}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {r.memberScores.map(s => (
                  <div key={s.memberId} style={{ background: '#0f172a', borderRadius: 4, padding: '4px 10px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {s.memberName} <strong>{s.score}</strong> <Badge ok={s.affordable} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

const sectionHeader: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: 1, color: '#64748b', marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
  padding: '8px 12px', color: '#e2e8f0', fontSize: 13, width: '100%', boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
  padding: '8px 14px', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
};
