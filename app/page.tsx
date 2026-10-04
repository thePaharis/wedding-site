import { weddingEvents } from "@/lib/events";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="monogram" href="#" aria-label="Nischal and Bhumika home">N <span>&</span> B</a>
        <nav aria-label="Main navigation"><a href="#celebration">Celebration</a><a href="#invitation">Your invitation</a></nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="title">
          <p className="eyebrow">Together with our families</p>
          <h1 id="title">Nischal <span>&</span><br />Bhumika</h1>
          <p className="hero-message">A new chapter. A celebration with the people we love.</p>
          <p className="date-line">February 1–6, 2027</p>
          <a className="button" href="#celebration">Explore the celebration</a>
          <p className="hero-note">Six events. One unforgettable week.</p>
        </section>
        <section className="celebration section" id="celebration" aria-labelledby="schedule-title">
          <div className="section-heading"><p className="eyebrow">Our wedding week</p><h2 id="schedule-title">Moments to share.</h2><p>We look forward to celebrating with you. Your personal invitation will show the events you are invited to.</p></div>
          <div className="event-grid">
            {weddingEvents.map((event, index) => (
              <article className="event" key={event.id}>
                <div className="event-top"><time dateTime={event.date}>FEB <strong>{Number(event.date.slice(-2)).toString().padStart(2, "0")}</strong></time><span className="event-number">0{index + 1}</span></div>
                <h3>{event.name}</h3><p>{event.timeLabel}</p><p className="venue">Venue to be announced</p>
              </article>
            ))}
          </div>
        </section>
        <section className="invitation section" id="invitation" aria-labelledby="invitation-title">
          <p className="eyebrow">A place for you</p><h2 id="invitation-title">Your personal invitation.</h2><p>When invitations are ready, we’ll share your family’s private link by email or text. It will include your invited events and a way to RSVP for each guest.</p><p className="invitation-note">Please use the link sent to you to view your invitation.</p>
        </section>
      </main>
      <footer><a className="monogram" href="#">N <span>&</span> B</a><p>With love, Nischal & Bhumika</p><span>February 2027</span></footer>
    </>
  );
}
