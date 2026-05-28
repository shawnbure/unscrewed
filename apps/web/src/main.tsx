import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.js";
import Home from "./pages/Home.js";
import Signup from "./pages/Signup.js";
import VerifyPhone from "./pages/VerifyPhone.js";
import Login from "./pages/Login.js";
import TwoFactor from "./pages/TwoFactor.js";
import Browse from "./pages/Browse.js";
import ListingDetail from "./pages/ListingDetail.js";
import NewListing from "./pages/NewListing.js";
import NegotiationPage from "./pages/Negotiation.js";
import Tos from "./pages/Tos.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="signup" element={<Signup />} />
          <Route path="signup/verify" element={<VerifyPhone />} />
          <Route path="login" element={<Login />} />
          <Route path="2fa" element={<TwoFactor />} />
          <Route path="browse" element={<Browse />} />
          <Route path="listing/:id" element={<ListingDetail />} />
          <Route path="post" element={<NewListing />} />
          <Route path="n/:id" element={<NegotiationPage />} />
          <Route path="tos" element={<Tos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
