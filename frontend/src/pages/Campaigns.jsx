import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api
      .get("/campaigns")
      .then((r) => {
        setCampaigns(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        setCampaigns([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const districts = useMemo(() => {
    const values = campaigns.flatMap((c) =>
      Array.isArray(c.districts) ? c.districts : []
    );

    return ["All", ...Array.from(new Set(values))];
  }, [campaigns]);

  const filtered = useMemo(() => {
    if (filter === "All") return campaigns;

    return campaigns.filter((c) =>
      Array.isArray(c.districts) ? c.districts.includes(filter) : false
    );
  }, [campaigns, filter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌱</div>
          <p className="text-gray-600">Loading campaigns...</p>
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
              Our Work
            </p>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Campaigns
            </h1>

            <p className="max-w-2xl text-lg text-white/80">
              Discover the initiatives through which Parivartan works with
              communities to create lasting social and environmental change.
            </p>
          </motion.div>
        </div>
      </section>

      {districts.length > 1 && (
        <section className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap gap-3">
            {districts.map((district) => (
              <button
                key={district}
                onClick={() => setFilter(district)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                  filter === district
                    ? "bg-[#163B2A] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {district}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-6 py-14">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-5">🌱</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              No campaigns found
            </h2>
            <p className="text-gray-600">
              Please check back soon for updates.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((campaign, index) => {
              const code = (campaign.code || "campaign").toLowerCase();
              const districtsList = Array.isArray(campaign.districts)
                ? campaign.districts
                : [];

              return (
                <motion.article
                  key={campaign.id || campaign.code || index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition"
                >
                  {campaign.image_url ? (
                    <img
                      src={campaign.image_url}
                      alt={campaign.title || "Campaign"}
                      className="w-full h-52 object-cover"
                    />
                  ) : (
                    <div className="w-full h-52 bg-[#DCE9D2] flex items-center justify-center">
                      <span className="text-6xl">🌱</span>
                    </div>
                  )}

                  <div className="p-7">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#527A45]">
                        {campaign.code || "Campaign"}
                      </span>

                      {campaign.status && (
                        <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700">
                          {campaign.status}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-bold text-[#163B2A] mb-3">
                      {campaign.title || "Untitled Campaign"}
                    </h2>

                    {campaign.summary && (
                      <p className="text-gray-600 leading-relaxed mb-5">
                        {campaign.summary}
                      </p>
                    )}

                    {districtsList.length > 0 && (
                      <p className="text-sm text-gray-500 mb-6">
                        📍 {districtsList.join(", ")}
                      </p>
                    )}

                    <Link
                      to={`/campaigns/${code}`}
                      className="inline-flex items-center font-semibold text-[#163B2A] hover:text-[#527A45]"
                    >
                      Learn more →
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
