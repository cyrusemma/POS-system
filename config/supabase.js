const SUPABASE_URL = "https://ngjtygpuykvzlnnjqmdo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nanR5Z3B1eWt2emxubmpxbWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjMzNzEsImV4cCI6MjA5MDEzOTM3MX0.mo2FLZcR8i9JXmHi1D2uzwZh4wlFfvL0jBsMnyIqFlU";

let db = null;

try {
  const { createClient } = supabase;
  db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("✅ Supabase initialized successfully");
} catch (initError) {
  console.error("❌ Supabase initialization failed:", initError);
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:#e0e0e0;font-family:system-ui">
      <div style="text-align:center">
        <h1>⚠️ Connection Error</h1>
        <p>Failed to initialize database connection. Please refresh the page.</p>
        <p style="color:#a0a0b0;font-size:12px">If the problem persists, check your internet connection.</p>
      </div>
    </div>
  `;
}
