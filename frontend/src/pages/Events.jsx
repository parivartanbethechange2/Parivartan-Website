import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Check, Clock, MapPin, Users } from "lucide-react";
import { PageHeader, Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
const monthLabel = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
export default function Events() {
  const { user, openAuth } = useAuth();
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(null);
  const [kind, setKind] = useState("All");
  const load = () =>
    api
      .get("/events")
      .then((r) => {
        setEvents(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        setEvents([]);
      });
  useEffect(() => {
    load();
  }, [user]);
  const kinds = [
    "All",
    ...new Set(
      events
        .map((e) => e?.kind)
        .filter(Boolean)
    ),
  ];
  const filtered =
    kind === "All"
      ? events
      : events.filter((e) => e?.kind === kind);
  const grouped = filtered.reduce((acc, e) => {
    if (!e?.date) return acc;
    const k = monthLabel(e.date);
    if (!acc[k]) {
      acc[k] = [];
    }
    acc[k].push(e);
    return acc;
  }, {});
  const rsvp = async (e) => {
    if (!user) {
      toast.info("Sign in to RSVP", {
        description:
          "One-click RSVP is available for signed-in members.",
      });
      return openAuth();
    }
    setBusy(e.id);
    try {
      const { data } = await api.post(`/events/${e.id}/rsvp`);
      toast.success(
        data.is_rsvped
          ? `You're going to ${e.title}`
          : "RSVP cancelled"
      );
      await load();
    } catch {
      toast.error("Could not update your RSVP.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <PageHeader
        testid="events-header"
        overline="Seminars & Events"
        title="Show up. That's the whole ask."
        sub="Plantation drives, SHG skill camps, health camps, eco-club workshops and seminars across Uttarakhand."
      />
      <section className="border-b border-line bg-sage/40">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-6">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              data-testid={`event-filter-${String(k)
                .replace(/\W+/g, "-")
                .toLowerCase()}`}
              className={`border px-5 py-2.5 text-xs transition-colors duration-300 ${
                kind === k
                  ? "border-forest bg-forest text-sand"
                  : "border-forest/25 text-ink/60 hover:border-forest/60"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </section>
      <section className="bg-sand">
        <div className="mx-auto max-w-[1400px] px-6 py-24">
          {Object.entries(grouped).map(([month, list]) => (
            <div key={month} className="mb-20">
              <Reveal>
                <div className="sticky top-[76px] z-20 -mx-6 bg-sand/85 px-6 py-4 backdrop-blur-xl">
                  <p className="overline text-clay">{month}</p>
                </div>
              </Reveal>
              <Stagger className="mt-8 space-y-6">
                {list.map((e) => {
                  const d = new Date(e.date);
                  return (
                    <StaggerItem key={e.id}>
                      <article
                        className="group grid gap-0 border border-line transition-shadow duration-500 hover:shadow-warmlg md:grid-cols-[120px_1fr_260px]"
                        data-testid={`event-card-${e.id}`}
                      >
                        <div className="flex flex-col items-center justify-center border-b border-line bg-sage/50 py-6 md:border-b-0 md:border-r">
                          <span className="serif text-5xl leading-none tracking-tight text-forest">
                            {d.getDate()}
                          </span>
                          <span className="overline mt-2 text-ink/50">
                            {d.toLocaleDateString("en-IN", {
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="p-7 md:p-9">
                          <span className="overline border border-line px-3 py-1 text-ink/55">
                            {e.kind || "Event"}
                          </span>
                          <h3 className="mt-5 serif text-2xl leading-snug tracking-tight md:text-3xl">
                            {e.title || "Untitled event"}
                          </h3>
                          <p className="mt-3 text-sm leading-relaxed text-ink/65">
                            {e.description || ""}
                          </p>
                          <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-xs text-ink/50">
                            <span className="flex items-center gap-2">
                              <Clock size={13} />
                              {e.time || ""}
                            </span>
                            <span className="flex items-center gap-2">
                              <MapPin size={13} />
                              {e.location || ""}
                            </span>
                            <span className="flex items-center gap-2">
                              <Users size={13} />
                              {Number(e.rsvp_count) || 0} /{" "}
                              {Number(e.capacity) || 0} confirmed
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center gap-4 border-t border-line p-7 md:border-l md:border-t-0">
                          <button
                            onClick={() => rsvp(e)}
                            disabled={busy === e.id}
                            data-testid={`rsvp-btn-${e.id}`}
                            className={`inline-flex items-center justify-center gap-3 px-6 py-3.5 text-sm transition-transform duration-300 hover:-translate-y-1 disabled:opacity-60 ${
                              e.is_rsvped
                                ? "border border-forest text-forest"
                                : "bg-clay text-white"
                            }`}
                          >
                            {e.is_rsvped ? (
                              <>
                                <Check size={15} /> You're going
                              </>
                            ) : (
                              <>
                                <Calendar size={15} /> One-click RSVP
                              </>
                            )}
                          </button>
                          {!user && (
                            <p className="text-center text-xs text-ink/45">
                              Sign in required to RSVP
                            </p>
                          )}
                          {e.is_rsvped && (
                            <p className="text-center text-xs text-ink/45">
                              Tap again to cancel
                            </p>
                          )}
                        </div>
                      </article>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </div>
          ))}
          {filtered.length === 0 && (
            <p
              className="py-20 text-center text-sm text-ink/50"
              data-testid="events-empty"
            >
              No events in this category yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
