import Image from "next/image";
import { getWeddingEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function Home() {
  const weddingEvents = await getWeddingEvents();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="monogram" href="#" aria-label="Nischal and Bhumika home">N<span>&</span>B</a>
        <nav aria-label="Main navigation"><a href="#celebration">The celebration</a><a href="#invitation">Your invitation</a></nav>
        <span className="header-date">FEBRUARY 2027</span>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="title">
          <div className="hero-copy">
            <p className="eyebrow">Together with our families</p>
            <h1 id="title">Nischal<span className="ampersand">&</span>Bhumika</h1>
            <div className="hero-rule" aria-hidden="true" />
            <p className="hero-message">Our next chapter begins.<br />We’d love you to be part of it.</p>
            <p className="date-line">February 1–6, 2027</p>
            <a className="button button-light" href="#celebration">Discover our wedding week</a>
            <span className="hero-bottom">WITH LOVE, ALWAYS</span>
          </div>
          <div className="hero-photo">
            <Image src="/photos/lakeside.webp" alt="Nischal and Bhumika holding hands by the lake" fill sizes="(max-width: 760px) 100vw, 55vw" preload />
            <span className="photo-caption">The beginning of forever.</span>
          </div>
        </section>
        <section className="welcome" aria-labelledby="welcome-title">
          <span className="small-mark" aria-hidden="true">N & B</span>
          <p className="eyebrow">Two hearts. Two families. One celebration.</p>
          <h2 id="welcome-title">Some moments are even more beautiful<br className="desktop-break" /> when we share them.</h2>
          <p>With our families by our side and our favorite people around us, we’re looking forward to a week of love, laughter, and new memories.</p>
        </section>
        <section className="celebration section" id="celebration" aria-labelledby="schedule-title">
          <div className="schedule-heading"><div><p className="eyebrow">February 1–6, 2027</p><h2 id="schedule-title">A week to remember.</h2></div><p>Six moments of celebration.<br />Your invitation will include the events<br className="desktop-break" /> we’d love you to join.</p></div>
          <div className="schedule-layout">
            <figure className="schedule-photo"><div className="portrait"><Image src="/photos/boat.webp" alt="Nischal and Bhumika together in a blue boat on the lake" fill sizes="(max-width: 760px) 90vw, 40vw" /></div><figcaption>Side by side, into everything ahead.</figcaption></figure>
            <div className="event-list">
              {weddingEvents.map((event) => (
                <article className={`event ${event.id === "wedding" ? "main-event" : ""}`} key={event.id}>
                  <time dateTime={event.date}><span>{new Intl.DateTimeFormat("en",{month:"short",timeZone:"UTC"}).format(new Date(`${event.date}T00:00:00Z`)).toUpperCase()}</span><strong>{event.date.slice(-2)}</strong></time>
                  <div className="event-details"><h3>{event.name}</h3><p>{event.timeLabel}</p><p className="venue">{event.venue || "Venue to be announced"}</p>{event.address && <p>{event.address}</p>}{event.description && <p>{event.description}</p>}{event.dressCode && <p>Dress code: {event.dressCode}</p>}{event.instructions && <p>{event.instructions}</p>}</div>
                  {event.id === "wedding" && <span className="event-tag">The big day</span>}
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="invitation" id="invitation" aria-labelledby="invitation-title">
          <div className="invitation-photo"><Image src="/photos/together.webp" alt="Nischal and Bhumika standing together beneath lakeside trees" fill sizes="(max-width: 760px) 100vw, 45vw" /></div>
          <div className="invitation-copy"><p className="eyebrow">Made personal, with love</p><h2 id="invitation-title">A little invitation.<br />A lot of love.</h2><p>We’ll send your family’s private invitation link by email or text. Inside, you’ll find your events and a way to RSVP for each guest.</p><div className="invitation-note"><span aria-hidden="true">✧</span><p>Invitations are coming soon.<br />Please use the personal link we send you.</p></div><p className="signature">Nischal & Bhumika</p></div>
        </section>
      </main>
      <footer><a className="monogram" href="#" aria-label="Return to top">N<span>&</span>B</a><p>We can’t wait to celebrate with you.</p><span>01 — 06 FEBRUARY 2027</span></footer>
    </>
  );
}
