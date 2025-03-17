const next = require("next");
const express = require("express");
const { closeMongoDbConnection } = require("./src/lib/mongodb");

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  server.all("*", (req, res) => handle(req, res));

  const httpServer = server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    console.log("Shutting down server...");

    // Close HTTP server
    httpServer.close(async () => {
      console.log("HTTP server closed");

      // Close MongoDB connections
      await closeMongoDbConnection();
      console.log("MongoDB connections closed");

      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
});
