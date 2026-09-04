import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary";

import Home from "./pages/Home";
import Campaigns from "./pages/Campaigns";
import Events from "./pages/Events";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/events" element={<Events />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
