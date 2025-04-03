import fs from "fs";
import csv from "csv-parser";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import getKontentConfig from "./config";

dotenv.config();

interface Config {
  projectId: string;
  apiKey: string;
  baseUrl: string;
  contentTypeCodename: string;
}

interface ValidationError {
  message: string;
}

interface ApiErrorResponse {
  validation_errors: ValidationError[];
}

const DEV_PROJECT_ID = process.env.KONTENT_DEV_PROJECT_ID || "";
const PROD_PROJECT_ID = process.env.KONTENT_PROD_PROJECT_ID || "";

const config: Config = getKontentConfig();

type LanguageMap = Record<string, string>;

const languageMap: LanguageMap = {
  default: "default",
  "zh-HK": "zh-HK",
  "zh-TW": "zh-TW",
  "ko-KR": "ko-KR",
  "ja-JP": "ja-JP",
  "es-MX": "es-MX",
};

export const validateCsv = (filePath: string): Promise<void> => {
  const REQUIRED_HEADERS = Object.keys(languageMap);
  return new Promise((resolve, reject) => {
    const headersSet = new Set<string>();
    let hasDataRow = false;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers) => {
        headers.forEach((header: string) => headersSet.add(header.trim())); // Normalize headers
      })
      .on("data", () => {
        hasDataRow = true; // At least one data row exists
      })
      .on("end", () => {
        const missingHeaders = REQUIRED_HEADERS.filter(
          (header) => !headersSet.has(header)
        );

        if (missingHeaders.length > 0) {
          return reject(
            new Error(`Missing required headers: ${missingHeaders.join(", ")}`)
          );
        }

        if (!hasDataRow) {
          return reject(
            new Error("CSV must contain at least one row of data.")
          );
        }

        resolve();
      })
      .on("error", (err) => {
        reject(new Error("Error reading CSV file: " + err.message));
      });
  });
};

async function findContentItem(contentItemCodename: string) {
  try {
    const response = await axios.get(
      `${config.baseUrl}/${config.projectId}/items/codename/${contentItemCodename}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error finding content item: ${error}`);
    return false;
  }
}

async function createContentItem(itemName: string, itemCodename: string) {
  try {
    const response = await axios.post(
      `${config.baseUrl}/${config.projectId}/items`,
      {
        name: itemName,
        codename: itemCodename,
        type: { codename: config.contentTypeCodename },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error creating content item: ${error}`);
    throw error;
  }
}

async function addLanguageVariant(
  itemId: string,
  languageId: string,
  elements: {
    element: { codename: string };
    value: string;
  }[]
) {
  try {
    const response = await axios.put(
      `${config.baseUrl}/${config.projectId}/items/${itemId}/variants/codename/${languageId}`,
      {
        elements,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error adding language variant: ${error}`);
    throw error;
  }
}

async function fetchReviewStepId() {
  try {
    // https://manage.kontent.ai/v2/projects/0fbc3572-8f63-0030-94d3-231315ab5e58/workflows
    const response = await axios.get(
      `${config.baseUrl}/${config.projectId}/workflows`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    const { data } = response;

    const defaultWorkflow = data.filter(
      (d: { codename: string }) => d.codename === "default"
    );

    const reviewStep = defaultWorkflow[0].steps.filter(
      (d: { codename: string }) => d.codename === "review"
    );

    return reviewStep[0]?.id;
  } catch (error) {
    console.error(`Error publishing language variant: ${error}`);
    throw error;
  }
}

async function transitionLanguageToReview(
  itemId: string,
  languageId: string,
  reviewStepId: string
) {
  // https://manage.kontent.ai/v2/projects/0fbc3572-8f63-0030-94d3-231315ab5e58/items/23de5f44-473b-5817-8128-4e12c2e495ad/variants/codename/default/change-workflow
  try {
    const response = await axios.put(
      `${config.baseUrl}/${config.projectId}/items/${itemId}/variants/codename/${languageId}/change-workflow`,
      {
        workflow_identifier: {
          codename: "default",
        },
        step_identifier: {
          id: reviewStepId,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error publishing language variant: ${error}`);
    throw error;
  }
}

async function publishLanguageVariant(itemId: string, languageId: string) {
  try {
    const response = await axios.put(
      `${config.baseUrl}/${config.projectId}/items/${itemId}/variants/codename/${languageId}/publish`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error publishing language variant: ${error}`);
    throw error;
  }
}

type CsvRow = Record<string, string>;

function mapCsvRowToElements(row: CsvRow, languageColumn: string) {
  return [
    {
      element: { codename: "title" },
      value: row[languageColumn] || row["default"] || "",
    },
  ];
}

function getLanguageId(languageCode: string): string | undefined {
  return languageMap[languageCode];
}

export async function processCsvFile(
  filePath: string,
  userEnvVariable: string,
  type: string
) {
  console.log(`Processing CSV file: ${filePath}`);
  const results: CsvRow[] = [];
  const languages = Object.keys(languageMap);

  config.projectId =
    userEnvVariable === "prod" ? PROD_PROJECT_ID : DEV_PROJECT_ID;

  config.contentTypeCodename = type;

  let processedCount = 0;
  let unprocessedCount = 0;
  const unprocessedRecords: { name: string; reason: string }[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ headers: languages }))
      .on("data", (row: CsvRow) => results.push(row))
      .on("end", async () => {
        try {
          for (let i = 1; i < results.length; i++) {
            const row = results[i];
            const itemName = row.default || `Item_${results.indexOf(row) + 1}`;
            const itemCodename = `${type}_${itemName
              .replace(/[- &]/g, "_")
              .toLowerCase()}`;

            if (await findContentItem(itemCodename)) {
              processedCount++;
              continue;
            }

            try {
              const contentItem = await createContentItem(
                itemName,
                itemCodename
              );
              let reviewStepId = null;
              if (userEnvVariable === "prod") {
                reviewStepId = await fetchReviewStepId();
                console.log("🚀 ~ .on ~ reviewStepId:", reviewStepId);
              }
              for (const language of languages) {
                const languageId = getLanguageId(language);
                if (!languageId) continue;

                const elements = mapCsvRowToElements(row, languageId);
                await addLanguageVariant(contentItem.id, languageId, elements);
                if (userEnvVariable === "prod") {
                  await transitionLanguageToReview(
                    contentItem.id,
                    languageId,
                    reviewStepId
                  );
                }
                await publishLanguageVariant(contentItem.id, languageId);
              }

              processedCount++;
            } catch (apiError) {
              console.error(
                `API Error processing item ${itemName}: ${apiError}`
              );
              const err = apiError as AxiosError;
              unprocessedCount++;
              const response = err?.response?.data as ApiErrorResponse;
              const validationErrors = response?.validation_errors;
              const unprocessedReason =
                validationErrors && validationErrors.length > 0
                  ? validationErrors[0].message
                  : err.message;

              unprocessedRecords.push({
                name: itemName,
                reason: unprocessedReason,
              });
              continue; // Stop processing if an API call fails
            }
          }

          console.log(
            `CSV processing completed. Processed: ${processedCount}, Unprocessed: ${unprocessedCount} Unprocessed Records: ${JSON.stringify(
              unprocessedRecords
            )}`
          );
          resolve({
            processedCount,
            unprocessedCount,
            unprocessedRecords,
          });
        } catch (error) {
          console.error(`Error processing CSV: ${error}`);
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error(`Error reading CSV file: ${error.message}`);
        reject(error);
      });
  });
}
