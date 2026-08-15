import { Link } from "react-router-dom";

export const Logo = ({ dark = false, size = 44, showText = true, className = "" }) => (
  <span className={`flex items-center gap-3 ${className}`}>
    <img
      src="/parivartan-logo.png"
      alt="Parivartan 'Be The Change' Social Welfare Society"
      style={{ height: size, width: "auto" }}
      className="shrink-0 object-contain transition-transform duration-500 group-hover:scale-[1.06]"
    />
    {showText && (
      <span className={`leading-none ${dark ? "text-sand" : "text-ink"}`}>
        <span className="block serif text-xl tracking-tight">Parivartan</span>
        <span className="overline block text-[9px] opacity-60">Be The Change</span>
      </span>
    )}
  </span>
);

export const BrandLink = ({ dark, size = 44 }) => (
  <Link to="/" className="group flex items-center" data-testid="brand-logo">
    <Logo dark={dark} size={size} />
  </Link>
);

export default Logo;
