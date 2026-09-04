import { useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Campaigns from "@/pages/Campaigns";
import Join from "@/pages/Join";
import ReportIssue from "@/pages/ReportIssue";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Events from "@/pages/Events";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import "@/App.css";
const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);
  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const sessionId = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    ).get("session_id");
    (async () => {
      try {
        const { data } = await api.post("/auth/session", {
          session_id: sessionId,
        });
        setUser(data);
        window.history.replaceState({}, "", "/dashboard");
        navigate(data.role === "admin" ? "/admin" : "/dashboard", {
          replace: true,
          state: { user: data },
        });
      } catch {
        window.history.replaceState({}, "", "/");
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, setUser]);
  return <div className="min-h-screen bg-sand" />;
};
function AppRoutes() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/join" element={<Join />} />
        <Route path="/report-issue" element={<ReportIssue />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/events" element={<Events />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
