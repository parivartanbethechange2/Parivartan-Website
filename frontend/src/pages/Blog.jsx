import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpRight, Bell, Search } from "lucide-react";
import { PageHeader, Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CATS = ["All", "Afforestation", "Women's Empowerment", "Child Education", "Health", "Transparency", "Community"];

export default function Blog() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState(null);
  const [email, setEmail] = useState("");
  const [subOn, setSubOn] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (user?.notify_newsletter) setSubOn(true);
  }, [user]);

  useEffect(() => {
    const params = {};
    if (cat !== "All") params.category = cat;
    if (q) params.q = q;
    if (tag) params.tag = tag;
    const t = setTimeout(() => {
      api.get("/blog", { params }).then((r) => setPosts(r.data)).catch(() => {});
    }, 220);
    return () => clearTimeout(t);
  }, [cat, q, tag]);

  const tags = useMemo(() => [...new Set(posts.flatMap((p) => p.tags || []))].slice(0, 12), [posts]);

  const toggleSub = async () => {
    if (!subOn) {
      if (!email) return toast.error("Enter your Gmail / email address first.");
      try {
        await api.post("/subscribe", { email });
        if (user) await api.put("/auth/preferences", { notify_email: user.notify_email, notify_events: user.notify_events, notify_newsletter: true });
        setSubOn(true);
        toast.success("Alerts on", { description: `We'll email new articles and drives to ${email}.` });
      } catch {
        toast.error("Could not subscribe. Check the email address.");
      }
    } else {
      if (user) await api.put("/auth/preferences", { notify_email: user.notify_email, notify_events: user.notify_events, notify_newsletter: false });
      setSubOn(false);
      toast.info("Alerts turned off.");
    }
  };

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <>
      <PageHeader
        testid="blog-header"
        overline="Journal & News"
        title="Field notes, not press releases."
        sub="What we learned planting 18,000 trees, running 25+ health camps and training 600+ women — written by the people who did it."
      />

      <section className="sticky top-[76px] z-30 border-b border-line bg-sand/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex flex-1 items-center gap-3 border border-line bg-sand px-4">
            <Search size={15} className="text-ink/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles…"
              data-testid="blog-search"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/35"
            />
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCat(c);
                  setTag(null);
                }}
                data-testid={`blog-cat-${c.replace(/\W+/g, "-").toLowerCase()}`}
                className={`whitespace-nowrap border px-4 py-2.5 text-xs transition-colors duration-300 ${
                  cat === c ? "border-forest bg-forest text-sand" : "border-line text-ink/60 hover:border-forest/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sand">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          {tags.length > 0 && (
            <div className="mb-14 flex flex-wrap items-center gap-3">
              <span className="overline text-ink/40">Tags</span>
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? null : t)}
                  data-testid={`blog-tag-${t.replace(/\W+/g, "-").toLowerCase()}`}
                  className={`text-xs underline-offset-4 transition-colors ${tag === t ? "text-clay underline" : "text-ink/50 hover:text-forest"}`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {posts.length === 0 && (
            <p className="py-20 text-center text-sm text-ink/50" data-testid="blog-empty">
              No articles match that search.
            </p>
          )}

          {featured && (
            <Reveal>
              <Link to={`/blog/${featured.slug}`} data-testid="blog-featured" className="group grid gap-0 overflow-hidden shadow-warm lg:grid-cols-2">
                <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[440px]">
                  <img src={featured.cover} alt={featured.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105" />
                </div>
                <div className="border border-line p-8 md:p-14">
                  <p className="overline text-clay">{featured.category}</p>
                  <h2 className="mt-6 serif text-3xl leading-tight tracking-tight md:text-4xl">{featured.title}</h2>
                  <p className="mt-5 text-sm leading-relaxed text-ink/70 md:text-base">{featured.excerpt}</p>
                  <p className="mt-8 inline-flex items-center gap-2 overline text-forest">
                    Read article <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>
            </Reveal>
          )}

          <Stagger className="mt-16 grid gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <StaggerItem key={p.id}>
                <Link to={`/blog/${p.slug}`} data-testid={`blog-card-${p.slug}`} className="group block">
                  <div className="aspect-[16/11] overflow-hidden">
                    <img src={p.cover} alt={p.title} className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105" />
                  </div>
                  <p className="overline mt-6 text-clay">{p.category}</p>
                  <h3 className="mt-3 serif text-2xl leading-snug tracking-tight">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/65">{p.excerpt}</p>
                  <p className="mt-5 text-xs text-ink/40">
                    {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • {p.author}
                  </p>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="relative overflow-hidden bg-forest text-sand grain" data-testid="subscribe-section">
        <div className="mx-auto max-w-[1400px] px-6 py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
            <Reveal>
              <p className="overline text-sage/70">Email alerts</p>
              <h2 className="mt-6 text-4xl tracking-tight md:text-5xl">Get every drive in your inbox.</h2>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-sand/70 md:text-base">
                New articles, plantation drive dates and camp announcements. Turn it off any time from your dashboard.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="border border-sand/25 p-8">
                <label className="overline text-sage/70">Your Gmail / email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  data-testid="subscribe-email"
                  className="mt-4 w-full border-b border-sand/30 bg-transparent py-3 text-sm text-sand outline-none placeholder:text-sand/35 focus:border-clay"
                />
                <button
                  onClick={toggleSub}
                  data-testid="subscribe-toggle"
                  className={`mt-8 inline-flex items-center gap-3 px-7 py-3.5 text-sm transition-colors duration-300 ${
                    subOn ? "bg-sand/15 text-sand" : "bg-clay text-white"
                  }`}
                >
                  <Bell size={15} />
                  {subOn ? "Alerts are ON — turn off" : "Turn on alerts"}
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
