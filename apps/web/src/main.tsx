import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.js";
import Home from "./pages/Home.js";
import Signup from "./pages/Signup.js";
import Login from "./pages/Login.js";
import Browse from "./pages/Browse.js";
import ListingDetail from "./pages/ListingDetail.js";
import NewListing from "./pages/NewListing.js";
import EditListing from "./pages/EditListing.js";
import NegotiationPage from "./pages/Negotiation.js";
import TradesPage from "./pages/Trades.js";
import AccountPage from "./pages/Account.js";
import ThoughtsPage from "./pages/Thoughts.js";
import CommunityPage from "./pages/Community.js";
import BlogPage from "./pages/Blog.js";
import BlogPostPage from "./pages/BlogPost.js";
import AdminBlogList from "./pages/admin/BlogList.js";
import BlogEdit from "./pages/admin/BlogEdit.js";
import Tos from "./pages/Tos.js";
import { AdminLayout } from "./pages/admin/AdminLayout.js";
import AdminDashboard from "./pages/admin/Dashboard.js";
import AdminUsers from "./pages/admin/Users.js";
import AdminListings from "./pages/admin/Listings.js";
import { RequireAdmin } from "./ui/RequireAdmin.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="signup" element={<Signup />} />
          <Route path="login" element={<Login />} />
          <Route path="browse" element={<Browse />} />
          <Route path="listing/:id" element={<ListingDetail />} />
          <Route path="post" element={<NewListing />} />
          <Route path="listing/:id/edit" element={<EditListing />} />
          <Route path="n/:id" element={<NegotiationPage />} />
          <Route path="trades" element={<TradesPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="thoughts" element={<ThoughtsPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="tos" element={<Tos />} />
          <Route
            path="admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="listings" element={<AdminListings />} />
            <Route path="blog" element={<AdminBlogList />} />
            <Route path="blog/new" element={<BlogEdit />} />
            <Route path="blog/:id/edit" element={<BlogEdit />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
