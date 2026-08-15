import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/Motion";
import { api } from "@/lib/api";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [missing, setMissing] = useState(false);
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    api
      .get(`/blog/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setMissing(true));
  }, [slug]);

  if (missing)
    return (
      <div className="mx-auto max-w-[1400px] px-6 pt-48 pb-32 text-center" data-testid="post-missing">
        <h1 className="serif text-4xl tracking-tight">Article not found.</h1>
        <Link to="/blog" className="mt-8 inline-block text-sm text-forest underline underline-offset-4">
          Back to the journal
        </Link>
      </div>
    );

  if (!post) return <div className="min-h-screen bg-sand" />;

  return (
    <>
      <motion.div style={{ scaleX: bar }} className="fixed left-0 top-0 z-[70] h-[3px] w-full origin-left bg-clay" />

      <header className="relative h-[62vh] min-h-[420px] overflow-hidden" data-testid="post-header">
        <img src={post.cover} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/92 via-ink/55 to-ink/35" />
        <div className="relative mx-auto flex h-full max-w-[1000px] flex-col justify-end px-6 pb-14">
          <p className="overline text-sage">{post.category}</p>
          <h1 className="mt-5 serif text-4xl leading-[1.02] tracking-tighter text-sand md:text-6xl">{post.title}</h1>
          <p className="mt-6 text-xs text-sand/60">
            {new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} • {post.author}
          </p>
        </div>
      </header>

      <article className="bg-sand">
        <div className="mx-auto max-w-[760px] px-6 py-20 md:py-28">
          <Reveal>
            <p className="serif text-2xl leading-snug tracking-tight text-forest md:text-3xl">{post.excerpt}</p>
          </Reveal>
          <div className="mt-12 space-y-7" data-testid="post-body">
            {post.body.split("\n\n").map((p, i) => (
              <Reveal key={i} delay={0.03 * i} y={18}>
                <p className="text-base leading-[1.85] text-ink/80 md:text-lg">{p}</p>
              </Reveal>
            ))}
          </div>

          {post.tags?.length > 0 && (
            <div className="mt-16 flex flex-wrap gap-3 border-t border-line pt-8">
              {post.tags.map((t) => (
                <span key={t} className="border border-line px-3 py-1.5 text-xs text-ink/55">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <Link to="/blog" data-testid="post-back" className="mt-14 inline-flex items-center gap-3 text-sm text-forest underline underline-offset-4">
            <ArrowLeft size={15} /> All articles
          </Link>
        </div>
      </article>
    </>
  );
}
