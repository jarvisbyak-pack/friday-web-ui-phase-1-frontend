import { createApi } from "./api.js";
import { config } from "./config.js";

const app = createApi();

app.listen(config.PORT, () => {
  console.log(`Friday backend listening on http://localhost:${config.PORT}`);
});
