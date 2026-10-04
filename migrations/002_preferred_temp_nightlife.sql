-- Add preferred temperature to preferences.
-- Scoring uses this to measure how far a destination's forecast is from what a member wants.
ALTER TABLE preferences
  ADD COLUMN preferred_temp_f NUMERIC(5,1) NOT NULL DEFAULT 72
    CHECK (preferred_temp_f BETWEEN 20 AND 110);

ALTER TABLE preferences
  ALTER COLUMN preferred_temp_f DROP DEFAULT;

-- Add curated nightlife score to destinations (0 = no nightlife, 1 = very active).
-- Scores are hand-curated estimates; see README for details.
ALTER TABLE destinations
  ADD COLUMN nightlife_score NUMERIC(3,2) NOT NULL DEFAULT 0
    CHECK (nightlife_score BETWEEN 0 AND 1);

UPDATE destinations SET nightlife_score = 0.72 WHERE iata = 'SFO';
UPDATE destinations SET nightlife_score = 0.85 WHERE iata = 'MIA';
UPDATE destinations SET nightlife_score = 0.90 WHERE iata = 'CDG';
UPDATE destinations SET nightlife_score = 0.78 WHERE iata = 'NRT';
UPDATE destinations SET nightlife_score = 0.88 WHERE iata = 'LHR';
UPDATE destinations SET nightlife_score = 0.70 WHERE iata = 'CUN';
UPDATE destinations SET nightlife_score = 0.55 WHERE iata = 'DEN';
UPDATE destinations SET nightlife_score = 0.75 WHERE iata = 'ORD';
UPDATE destinations SET nightlife_score = 0.95 WHERE iata = 'LAS';
UPDATE destinations SET nightlife_score = 0.87 WHERE iata = 'BCN';

ALTER TABLE destinations ALTER COLUMN nightlife_score DROP DEFAULT;
