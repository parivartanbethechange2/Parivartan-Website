import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader, Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { api } from "@/lib/api";
import { EVENT_IMAGES } from "@/data/content";
export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    api
      .get("/events")
      .then((r) => {
        if (!mounted) return;
        const data = Array.isArray(r?.data) ? r.data : [];
        setEvents(data);
      })
      .catch(() => {
        if (!mounted) return;
        setEvents([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <>
      <PageHeader
        testid="events-header"
        overline="Gather with purpose"
        title="Events that move people."
        sub="From field visits to community gatherings, come meet the people and places behind the work."
      />
      <section className="bg-sage/30">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
          <Reveal>
            <p className="overline text-clay">
              Upcoming events • {events.length}
            </p>
          </Reveal>
          {loading ? (
            <div className="mt-12 border border-line bg-sand p-8">
              <p className="text-sm text-ink/50">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="mt-12 border border-line bg-sand p-8 md:p-12">
              <p className="serif text-2xl">No upcoming events yet.</p>
              <p className="mt-3 text-sm text-ink/55">
                Check back soon for the next Parivartan gathering.
              </p>
            </div>
          ) : (
            <Stagger className="mt-12 grid gap-8 lg:grid-cols-2">
              {events.map((event, i) => {
                const image =
                  event?.image ||
                  EVENT_IMAGES?.[i % EVENT_IMAGES.length] ||
                  "";
                const date = event?.date
                  ? new Date(event.date)
                  : null;
                const validDate =
                  date && !Number.isNaN(date.getTime());
                const rsvpCount = Number(event?.rsvp_count) || 0;
                return (
                  <StaggerItem key={event?.id || `event-${i}`}>
                    <motion.article
                      className="overflow-hidden border border-line bg-sand"
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.3 }}
                      data-testid={`event-card-${i}`}
                    >
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={image}
                          alt={event?.title || "Parivartan event"}
                          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                      </div>
                      <div className="p-7 md:p-9">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink/50">
                          {validDate && (
                            <span className="flex items-center gap-2">
                              <CalendarDays size={14} />
                              {date.toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          )}
                          {event?.location && (
                            <span className="flex items-center gap-2">
                              <MapPin size={14} />
                              {event.location}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-5 serif text-3xl tracking-tight">
                          {event?.title || "Parivartan event"}
                        </h2>
                        {event?.description && (
                          <p className="mt-4 text-sm leading-relaxed text-ink/65">
                            {event.description}
                          </p>
                        )}
                        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                          {rsvpCount > 0 && (
                            <span className="flex items-center gap-2 text-xs text-ink/50">
                              <Users size={14} />
                              {rsvpCount} attending
                            </span>
                          )}
                          {event?.slug ? (
                            <Link
                              to={`/events/${event.slug}`}
                              className="bg-clay px-6 py-3 text-sm text-white transition-transform hover:-translate-y-0.5"
                            >
                              View event
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="bg-clay px-6 py-3 text-sm text-white"
                            >
                              RSVP
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </div>
      </section>
    </>
  );
}
