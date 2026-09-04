import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/events")
      .then((r) => {
        setEvents(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8F4]">
      <section className="bg-[#163B2A] text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[#B8D89C] font-semibold uppercase tracking-wider mb-3">
              Join Us
            </p>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">Events</h1>

            <p className="max-w-2xl text-lg text-white/80">
              Stay connected with Parivartan through our upcoming events,
              workshops, community gatherings and campaigns.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14">
        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-5">📅</div>

            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              No upcoming events
            </h2>

            <p className="text-gray-600">
              Please check back soon for upcoming events.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event, index) => (
              <motion.article
                key={event.id || index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition"
              >
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title || "Event"}
                    className="w-full h-52 object-cover"
                  />
                ) : (
                  <div className="w-full h-52 bg-[#DCE9D2] flex items-center justify-center">
                    <span className="text-6xl">📅</span>
                  </div>
                )}

                <div className="p-7">
                  {event.date && (
                    <p className="text-sm font-semibold text-[#527A45] mb-3">
                      {event.date}
                    </p>
                  )}

                  <h2 className="text-2xl font-bold text-[#163B2A] mb-3">
                    {event.title || "Untitled Event"}
                  </h2>

                  {event.description && (
                    <p className="text-gray-600 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {event.location && (
                    <p className="text-sm text-gray-500 mt-5">
                      📍 {event.location}
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
