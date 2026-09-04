import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { api } from "@/lib/api";
import { JOURNAL_IMAGES } from "@/data/content";
export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    api
      .get("/blog")
      .then((r) => {
        if (!mounted) return;
        const data = Array.isArray(r?.data) ? r.data : [];
        setPosts(data);
      })
      .catch(() => {
        if (!mounted) return;
        setPosts([]);
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
        testid="blog-header"
        overline="The journal"
        title="Stories from the work."
        sub="Field notes, ideas, and voices from the communities we work alongside."
      />
      <section className="bg-sage/30">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
          <Reveal>
            <p className="overline text-clay">
              Latest stories • {posts.length}
            </p>
          </Reveal>
          {loading ? (
            <div className="mt-12 border border-line bg-sand p-8">
              <p className="text-sm text-ink/50">Loading stories...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-12 border border-line bg-sand p-8 md:p-12">
              <p className="serif text-2xl">
                No journal stories are published yet.
              </p>
              <p className="mt-3 text-sm text-ink/55">
                Check back soon for stories from the field.
              </p>
            </div>
          ) : (
            <Stagger className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => {
                const image =
                  post?.cover ||
                  post?.image ||
                  JOURNAL_IMAGES?.[i % JOURNAL_IMAGES.length] ||
                  "";
                const slug = post?.slug;
                return (
                  <StaggerItem key={post?.id || slug || `post-${i}`}>
                    <article data-testid={`blog-card-${i}`}>
                      <div className="group aspect-[4/3] overflow-hidden bg-sage/20">
                        <img
                          src={image}
                          alt={post?.title || "Journal story"}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="mt-6 flex items-center justify-between gap-4">
                        <p className="overline text-ink/45">
                          {post?.category || "Journal"}
                        </p>
                        {post?.published_at && (
                          <p className="text-xs text-ink/40">
                            {new Date(post.published_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        )}
                      </div>
                      <h2 className="mt-3 serif text-2xl leading-tight tracking-tight md:text-3xl">
                        {post?.title || "Untitled story"}
                      </h2>
                      {post?.excerpt && (
                        <p className="mt-4 text-sm leading-relaxed text-ink/60">
                          {post.excerpt}
                        </p>
                      )}
                      {slug && (
                        <Link
                          to={`/blog/${slug}`}
                          className="mt-6 inline-flex items-center gap-2 text-sm text-forest transition-colors hover:text-clay"
                        >
                          Read story
                          <ArrowUpRight size={15} />
                        </Link>
                      )}
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
