import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = {};

    if (category !== "All") {
      params.category = category;
    }

    if (search.trim()) {
      params.search = search.trim();
    }

    api
      .get("/blog", { params })
      .then((r) => {
        setPosts(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [category, search]);

  const categories = useMemo(() => {
    const values = posts
      .map((post) => post.category)
      .filter(Boolean);

    return ["All", ...Array.from(new Set(values))];
  }, [posts]);

  return (
    <main className="min-h-screen bg-[#F7F8F4]">
      <section className="bg-[#163B2A] text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[#B8D89C] font-semibold uppercase tracking-wider mb-3">
              Stories & Insights
            </p>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Journal
            </h1>

            <p className="max-w-2xl text-lg text-white/80">
              Stories, reflections, field updates and ideas from the
              Parivartan community.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  category === item
                    ? "bg-[#163B2A] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search journal..."
            className="w-full md:w-72 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#527A45]"
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📖</div>
            <p className="text-gray-600">Loading journal...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-5">📖</div>

            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              No journal posts found
            </h2>

            <p className="text-gray-600">
              Please check back soon for stories and updates.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <motion.article
                key={post.id || post.slug || index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title || "Journal post"}
                    className="w-full h-52 object-cover"
                  />
                ) : (
                  <div className="w-full h-52 bg-[#DCE9D2] flex items-center justify-center">
                    <span className="text-6xl">📖</span>
                  </div>
                )}

                <div className="p-7">
                  {post.category && (
                    <p className="text-xs font-bold uppercase tracking-wider text-[#527A45] mb-3">
                      {post.category}
                    </p>
                  )}

                  <h2 className="text-2xl font-bold text-[#163B2A] mb-3">
                    {post.title || "Untitled Post"}
                  </h2>

                  {post.excerpt && (
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {post.excerpt}
                    </p>
                  )}

                  {post.slug && (
                    <Link
                      to={`/blog/${post.slug}`}
                      className="font-semibold text-[#163B2A] hover:text-[#527A45]"
                    >
                      Read more →
                    </Link>
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
