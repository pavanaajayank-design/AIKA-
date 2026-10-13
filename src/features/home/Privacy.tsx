export default function Privacy() {
  return (
    <section className="article-page">
      <span className="eyebrow">DATA SECURITY & TRUST</span>
      <h1>Your privacy stays in your hands.</h1>
      <div className="panel">
        <h2>Privacy and data practices at AIKA</h2>
        <p>
          AIKA is designed around simplicity, clarity, and data minimization. We believe travel planning should be thoughtful, reliable, and respectful of your personal boundaries.
        </p>

        <h3>Data minimization</h3>
        <p>
          We only ask for the flight schedule and itinerary preferences required to calculate your available layover window. AIKA never asks for, processes, or stores sensitive travel documents such as passport numbers, national ID cards, ticket purchase receipts, or payment information.
        </p>

        <h3>Account security and authorization</h3>
        <p>
          When you create an account, your authentication credentials are managed with secure, industry-standard cryptographic protection. Your saved trips in My Trips are guarded by database-level Row Level Security (RLS), ensuring that your private itineraries can only ever be accessed or modified by your authenticated session.
        </p>

        <h3>Itinerary calculation transparency</h3>
        <p>
          All layover time breakdowns, buffer protections, and scenario simulations run deterministically. Calculations are transparently reported so you know exactly which assumptions were made for airport procedures, road travel, and gate return deadlines.
        </p>

        <h3>External providers and mapping</h3>
        <p>
          Map views display open-source OpenStreetMap tiles with proper attribution. Weather and routing estimates query provider endpoints using airport and destination coordinates only—never your personal identity or booking records.
        </p>
      </div>
      <a href="#home" className="button">
        Back to AIKA
      </a>
    </section>
  );
}
