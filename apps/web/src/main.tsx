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
import NeighborhoodPage from "./pages/Neighborhood.js";
import PublicBenefitPage from "./pages/PublicBenefit.js";
import ThoughtsPage from "./pages/Thoughts.js";
import CommunityPage from "./pages/Community.js";
import BlogPage from "./pages/Blog.js";
import BlogPostPage from "./pages/BlogPost.js";
import AdminBlogList from "./pages/admin/BlogList.js";
import BlogEdit from "./pages/admin/BlogEdit.js";
import AdminReports from "./pages/admin/Reports.js";
import Tos from "./pages/Tos.js";
import UMassPage from "./pages/UMass.js";
import SafetyPage from "./pages/Safety.js";
import ContactPage from "./pages/Contact.js";
import EmailPreferencesPage from "./pages/EmailPreferences.js";
import VerifyEmailPage from "./pages/VerifyEmail.js";
import { AdminLayout } from "./pages/admin/AdminLayout.js";
import AdminDashboard from "./pages/admin/Dashboard.js";
import AdminUsers from "./pages/admin/Users.js";
import AdminListings from "./pages/admin/Listings.js";
import AdminSupport from "./pages/admin/Support.js";
import { RequireAdmin } from "./ui/RequireAdmin.js";
import { RequireAuth } from "./ui/RequireAuth.js";
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
          <Route
            path="post"
            element={
              <RequireAuth>
                <NewListing />
              </RequireAuth>
            }
          />
          <Route
            path="listing/:id/edit"
            element={
              <RequireAuth>
                <EditListing />
              </RequireAuth>
            }
          />
          <Route
            path="n/:id"
            element={
              <RequireAuth>
                <NegotiationPage />
              </RequireAuth>
            }
          />
          <Route
            path="trades"
            element={
              <RequireAuth>
                <TradesPage />
              </RequireAuth>
            }
          />
          <Route
            path="account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="neighborhood"
            element={
              <RequireAuth>
                <NeighborhoodPage />
              </RequireAuth>
            }
          />
          <Route path="thoughts" element={<ThoughtsPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="public-benefit" element={<PublicBenefitPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="tos" element={<Tos />} />
          <Route path="safety" element={<SafetyPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="email-preferences" element={<EmailPreferencesPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="umass" element={<UMassPage />} />
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
            <Route path="reports" element={<AdminReports />} />
            <Route path="support" element={<AdminSupport />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
