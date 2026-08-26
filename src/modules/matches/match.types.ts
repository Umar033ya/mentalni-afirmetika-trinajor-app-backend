export interface MatchHistoryRow {
  id: string;
  type: "duel" | "practice" | "challenge";
  duel_id: string | null;
  player1_id: string;
  player2_id: string | null;
  winner_id: string | null;
  is_draw: boolean;
  player1_score: number | null;
  player2_score: number | null;
  played_at: string;
  created_at: string;
}
