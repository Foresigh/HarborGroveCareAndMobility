const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy /pay/* to the dashboard Railway app
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.harborgrovecareandmobility.com";

app.use(
  "/pay",
  createProxyMiddleware({
    target: DASHBOARD_URL,
    changeOrigin: true,
    // Keep path as-is so /pay/HG-... reaches the dashboard's /pay/HG-... route
  })
);

// Serve static marketing site files
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for any unmatched route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Harbor Grove site running on port ${PORT}`);
  console.log(`Proxying /pay/* → ${DASHBOARD_URL}`);
});
