import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import FlightSimulator from "./FlightSimulator.jsx";
// import App from "./App.jsx"; // Original app - kept for reference
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FlightSimulator />
    <Analytics />
  </React.StrictMode>
);
