import dotenv from "dotenv";

dotenv.config();

interface Config {
  projectId: string;
  apiKey: string;
  baseUrl: string;
  contentTypeCodename: string;
}

const config: Config = {
  projectId:
    (process.env.ENV === "prod"
      ? process.env.KONTENT_PROD_PROJECT_ID
      : process.env.KONTENT_DEV_PROJECT_ID) || "",
  apiKey:
    (process.env.ENV === "prod"
      ? process.env.KONTENT_PROD_MANAGEMENT_API_KEY
      : process.env.KONTENT_DEV_MANAGEMENT_API_KEY) || "",
  baseUrl:
    (process.env.ENV === "prod"
      ? process.env.KONTENT_PROD_BASE_URL
      : process.env.KONTENT_DEV_BASE_URL) || "",
  contentTypeCodename: process.env.CONTENT_TYPE_CODENAME || "",
};

export default function getKontentConfig() {
  return config;
}
