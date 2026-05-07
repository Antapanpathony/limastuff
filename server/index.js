import { app, db } from './app.js';

const PORT = process.env.PORT || 3001;

await db.read();
db.data ??= { users: [], provider_profiles: [], bookings: [], booking_items: [] };

app.listen(PORT, () => {
  console.log(`PeruServ API running on http://localhost:${PORT}`);
});
