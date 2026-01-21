import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

if (import.meta.env.PROD) {
  root.render(<StrictMode>{app}</StrictMode>);
} else {
  root.render(app);
}
