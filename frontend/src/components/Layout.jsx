import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Leaf, ArrowUpRight } from "lucide-react";
import Lenis from "lenis";
import { useAuth } from "@/context/AuthContext";
import { ORG, COMPLIANCE } from "@/data/content";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/join", label: "Join" },
  { to: "/report-issue", label: "Helpmate" },
  { to: "/blog", label: "Journal" },
  { to: "/events", label: "Events" },
];

const Brand = ({ dark }) => (
  <Link to="/" className={`group flex items-center gap-3 ${dark ? "text-sand" : "text-ink"}`} data-testid="brand-logo">
    <span
      className={`grid h-9 w-9 place-items-center transition-transform duration-500 group-hover:rotate-[18deg] ${
        dark ? "bg-sand text-forest" : "bg-forest text-sand"
      }`}
    >
      <Leaf size={17} strokeWidth={1.8} />
    </span>
    <span className="leading-none">
      <span className="block serif text-xl tracking-tight">Parivartan</span>
      <span className="overline block text-[9px] opacity-60">Be The Change</span>
    </span>
  </Link>
);

const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, login } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          scrolled ? "bg-sand/80 backdrop-blur-xl border-b border-line/60" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5">
          <Brand dark={!scrolled} />
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `relative text-sm transition-colors ${
                    scrolled
                      ? isActive
                        ? "text-forest"
                        : "text-ink/60 hover:text-forest"
                      : isActive
                        ? "text-sand"
                        : "text-sand/70 hover:text-sand"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {n.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-dot"
                        className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 bg-clay"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={user.role === "admin" ? "/admin" : "/dashboard"}
                data-testid="nav-dashboard"
                className={`hidden items-center gap-2 border px-5 py-2.5 text-sm transition-colors sm:flex ${
                  scrolled
                    ? "border-forest text-forest hover:bg-forest hover:text-sand"
                    : "border-sand/50 text-sand hover:bg-sand hover:text-ink"
                }`}
              >
                {user.role === "admin" ? "Admin" : "Dashboard"}
              </Link>
            ) : (
              <button
                onClick={login}
                data-testid="nav-login-btn"
                className={`hidden border px-5 py-2.5 text-sm transition-colors sm:block ${
                  scrolled
                    ? "border-forest text-forest hover:bg-forest hover:text-sand"
                    : "border-sand/50 text-sand hover:bg-sand hover:text-ink"
                }`}
              >
                Sign in
              </button>
            )}
            <Link
              to="/campaigns"
              data-testid="nav-donate-btn"
              className="hidden bg-clay px-5 py-2.5 text-sm text-white transition-transform duration-300 hover:-translate-y-1 sm:block"
            >
              Donate
            </Link>
            <button
              onClick={() => setOpen(true)}
              data-testid="nav-menu-btn"
              aria-label="Open menu"
              className={`grid h-10 w-10 place-items-center border lg:hidden ${
                scrolled ? "border-line text-ink" : "border-sand/50 text-sand"
              }`}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-forest text-sand"
            data-testid="mobile-menu"
          >
            <div className="flex items-center justify-between px-6 py-5">
              <Brand dark />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                data-testid="nav-close-btn"
                className="grid h-10 w-10 place-items-center border border-sand/30"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="mt-6 flex flex-col px-6">
              {[...NAV, { to: "/dashboard", label: "Dashboard" }].map((n, i) => (
                <motion.div
                  key={n.to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link
                    to={n.to}
                    data-testid={`mnav-${n.label.toLowerCase()}`}
                    className="flex items-center justify-between border-b border-sand/15 py-5 serif text-3xl"
                  >
                    {n.label}
                    <ArrowUpRight size={18} className="opacity-50" />
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Footer = () => (
  <footer className="relative overflow-hidden bg-ink text-sand/70 grain">
    <div className="mx-auto max-w-[1400px] px-6 py-20">
      <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <h2 className="serif text-4xl md:text-5xl tracking-tight text-sand">
            Be the change.
            <br />
            Start with one tree.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed">{ORG.address}</p>
          <p className="mt-3 text-sm">Reg. No. {ORG.regNo} • Est. {ORG.founded}</p>
        </div>
        <div>
          <p className="overline text-sage/70">Explore</p>
          <ul className="mt-6 space-y-3 text-sm">
            {NAV.concat({ to: "/dashboard", label: "Dashboard" }).map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="transition-colors hover:text-sand">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="overline text-sage/70">Compliance</p>
          <ul className="mt-6 space-y-3 text-sm">
            {COMPLIANCE.map((c) => (
              <li key={c.label}>
                <span className="text-sand/50">{c.label}</span> — {c.value}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-16 flex flex-col gap-3 border-t border-sand/15 pt-8 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {ORG.name}</p>
        <p>Donations eligible for 80G tax exemption.</p>
      </div>
    </div>
  </footer>
);

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    let id;
    const raf = (t) => {
      lenis.raf(t);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-sand">
      <Nav />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
