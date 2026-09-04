import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { api } from "@/lib/api";
export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const params = {};
    if (category !== "all") {
      params.category = category;
    }
    if (search.trim()) {
      params.search = search.trim();
    }
    const t = setTimeout(() => {
      api
        .get("/blog", { params })
        .then((r) => {
          setPosts(Array.isArray(r.data) ? r.data : []);
        })
        .catch(() => {
          setPosts([]);
        });
    }, 220);
    return () => clearTimeout(t);
  }, [category, search]);
  const categories = [
    "all",
    ...Array.from(
      new Set(
        posts
          .map((p) => p?.category)
          .filter(Boolean)
      )
    ),
  ];
  return (
    <>
      <PageHeader
        testid="blog-header"
        overline="The Journal"
        title="Field notes, ideas & stories."
        sub="Updates from our work, reflections from the field, and stories from the communities we work alongside."
      />
      <section className="bg-sage/30">
        <div className="mx-auto max-w-[1400px] px-6 py-20 md:py-28">
          <div className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors ${
                    category === item
                      ? "bg-forest text-sand"
                      : "border border-line text-ink/60 hover:bg-sand"
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
              placeholder="Search the journal"
              className="w-full border border-line bg-sand px-4 py-3 text-sm outline-none placeholder:text-ink/35 focus:border-forest md:w-72"
              aria-label="Search the journal"
            />
          </div>
          {posts.length === 0 ? (
            <Reveal>
              <div className="py-24 text-center">
                <p className="serif text-2xl text-ink/70">
                  No journal entries found.
                </p>
                <p className="mt-3 text-sm text-ink/45">
                  Try another search or category.
                </p>
              </div>
            </Reveal>
          ) : (
            <Stagger className="mt-14 grid gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => {
                const slug = post?.slug || post?.id || `post-${i}`;
                const title = post?.title || "Untitled journal entry";
                const excerpt =
                  post?.excerpt ||
                  post?.summary ||
                  post?.description ||
                  "";
                const image =
                  post?.cover ||
                  post?.image ||
                  post?.cover_image ||
                  "";
                const postCategory = post?.category || "Journal";
                const date = post?.date || post?.published_at || "";
                return (
                  <StaggerItem key={post?.id || slug}>
                    <article>
                      {image ? (
                        <Link
                          to={`/blog/${slug}`}
                          className="group block aspect-[16/10] overflow-hidden bg-sage"
                        >
                          <img
                            src={image}
                            alt={title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </Link>
                      ) : (
                        <Link
                          to={`/blog/${slug}`}
                          className="block aspect-[16/10] bg-sage"
                        />
                      )}
                      <div className="mt-6 flex items-center justify-between gap-4 text-xs text-ink/45">
                        <span className="overline">{postCategory}</span>
                        {date && <span>{date}</span>}
                      </div>
                      <Link to={`/blog/${slug}`} className="group block">
                        <h2 className="mt-3 serif text-2xl leading-tight tracking-tight md:text-3xl">
                          {title}
                        </h2>
                        {excerpt && (
                          <p className="mt-4 text-sm leading-relaxed text-ink/60">
                            {excerpt}
                          </p>
                        )}
                        <span className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-clay">
                          Read story
                          <ArrowUpRight size={14} />
                        </span>
                      </Link>
                    </article>
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
