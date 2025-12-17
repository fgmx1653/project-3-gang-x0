-- Create table for tracking game plays
CREATE TABLE IF NOT EXISTS game_plays (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    played_at TIMESTAMP NOT NULL DEFAULT NOW(),
    play_date DATE NOT NULL DEFAULT CURRENT_DATE,
    points_earned INTEGER NOT NULL DEFAULT 0,
    moves INTEGER,
    time_seconds INTEGER,
    completed BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT game_plays_customer_date_unique UNIQUE (customer_id, play_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_plays_customer_date ON game_plays(customer_id, play_date);
CREATE INDEX IF NOT EXISTS idx_game_plays_played_at ON game_plays(played_at);

COMMENT ON TABLE game_plays IS 'Tracks customer game plays - one per day per customer';
COMMENT ON COLUMN game_plays.customer_id IS 'Reference to the customer who played';
COMMENT ON COLUMN game_plays.played_at IS 'Timestamp when the game was played';
COMMENT ON COLUMN game_plays.play_date IS 'Date of play (for daily limit enforcement)';
COMMENT ON COLUMN game_plays.points_earned IS 'Points awarded for completing the game';
COMMENT ON COLUMN game_plays.moves IS 'Number of moves taken to complete';
COMMENT ON COLUMN game_plays.time_seconds IS 'Time in seconds to complete';
COMMENT ON COLUMN game_plays.completed IS 'Whether the game was completed (true) or abandoned (false)';
