import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Cleanup old localStorage keys on app startup
// Only keep accessToken and refreshToken for security
const cleanupLocalStorage = () => {
  const allowedKeys = ["accessToken", "refreshToken"];
  const keysToRemove = [];
  
  // Check all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !allowedKeys.includes(key)) {
      keysToRemove.push(key);
    }
  }
  
  // Remove unwanted keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Removed insecure localStorage key: ${key}`);
  });
};

// Run cleanup on app startup
cleanupLocalStorage();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
