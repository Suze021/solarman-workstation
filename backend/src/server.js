const { config } = require("./config");
const { app } = require("./app");

const port = config.port;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

module.exports = { app };
