import dotenv from "dotenv";
import path from "path";

const backendEnvPath =
  path.resolve(__dirname, "../../.env");

dotenv.config({
  path: backendEnvPath,
  override: true,
});

export {
  backendEnvPath,
};
