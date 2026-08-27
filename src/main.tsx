import React from "react";
import { createRoot } from "react-dom/client";
import SpinExperience from "./customer/SpinExperience";
import { installApiBridge } from "./api-bridge";
import "./globals.css";
installApiBridge();
createRoot(document.getElementById("root")!).render(<React.StrictMode><SpinExperience /></React.StrictMode>);
