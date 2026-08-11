// Supabase Edge Function: minecraft-leaderboard-sync
// Deploy via: supabase functions deploy minecraft-leaderboard-sync

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[minecraft-leaderboard-sync] Function started");
    console.log("[minecraft-leaderboard-sync] Method:", req.method);

    // Authentication token check
    const syncTokenHeader = req.headers.get("x-sync-token") || req.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = Deno.env.get("SUPABASE_SYNC_TOKEN") || "fxcdr5ffdrhhythgytyhttf";

    if (syncTokenHeader !== expectedToken) {
      console.warn("[minecraft-leaderboard-sync] Unauthorized access attempt with token:", syncTokenHeader);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Invalid SUPABASE_SYNC_TOKEN" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse JSON payload safely
    let payload: any;
    try {
      const text = await req.text();
      payload = text ? JSON.parse(text) : null;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON request body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!payload) {
      return new Response(
        JSON.stringify({ success: false, error: "Empty request body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { leaderboard_type, players } = payload;
    console.log("[minecraft-leaderboard-sync] Leaderboard type:", leaderboard_type);
    console.log("[minecraft-leaderboard-sync] Player count:", Array.isArray(players) ? players.length : 0);

    if (!leaderboard_type || !Array.isArray(players)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid payload: 'leaderboard_type' and 'players' array required."
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Supabase environment variables (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are missing."
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();
    const formattedRows = players.map((p: any) => ({
      leaderboard_type,
      player_uuid: String(p.uuid || p.name || 'unknown-uuid'),
      player_name: String(p.name || p.uuid || 'Unknown Player'),
      score: Number(p.score || 0),
      rank: Number(p.rank || 0),
      updated_at: now
    }));

    console.log("[minecraft-leaderboard-sync] Starting Supabase upsert...");
    const { error } = await supabase
      .from("minecraft_leaderboards")
      .upsert(formattedRows, { onConflict: "leaderboard_type,player_uuid" });

    if (error) {
      console.error("[minecraft-leaderboard-sync] Upsert failed:", error.message);
      const isTableMissing = error.message.includes("relation") || error.message.includes("does not exist") || error.code === "42P01";
      return new Response(
        JSON.stringify({
          success: false,
          error: isTableMissing
            ? "minecraft_leaderboards table does not exist in database"
            : "Database query failed",
          details: error.message
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("[minecraft-leaderboard-sync] Upsert completed successfully.");
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synchronized ${formattedRows.length} leaderboard records for '${leaderboard_type}'`,
        count: formattedRows.length,
        timestamp: now
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("SYNC FUNCTION ERROR:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
