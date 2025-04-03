import fs from "fs";
import csv from "csv-parser";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

interface Config {
  projectId: string;
  apiKey: string;
  baseUrl: string;
  contentTypeCodename: string;
}

const config: Config = {
  projectId: process.env.KONTENT_PROJECT_ID || "0fbc3572-8f63-0030-94d3-231315ab5e58",
  apiKey: process.env.KONTENT_MANAGEMENT_API_KEY || "your_api_key_here",
  baseUrl: "https://manage.kontent.ai/v2/projects",
  contentTypeCodename: process.env.CONTENT_TYPE_CODENAME || "major_market_list",
};

type LanguageMap = Record<string, string>;

const languageMap: LanguageMap = {
  default: "default",
  "zh-HK": "zh-HK",
  "zh-TW": "zh-TW",
  "ko-KR": "ko-KR",
  "ja-JP": "ja-JP",
  "es-MX": "es-MX",
};

async function findContentItem(contentItemCodename: string) {
  try {
    const response = await axios.get(`${config.baseUrl}/${config.projectId}/items/codename/${contentItemCodename}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error finding content item: ${error}`);
    return false;
  }
}

async function createContentItem(itemName: string, itemCodename: string) {
  try {
    const response = await axios.post(`${config.baseUrl}/${config.projectId}/items`, {
      name: itemName,
      codename: itemCodename,
      type: { codename: config.contentTypeCodename },
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error creating content item: ${error}`);
    throw error;
  }
}

async function addLanguageVariant(itemId: string, languageId: string, elements: any) {
  try {
    const response = await axios.put(`${config.baseUrl}/${config.projectId}/items/${itemId}/variants/codename/${languageId}`, {
      elements,
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error adding language variant: ${error}`);
    throw error;
  }
}

async function publishLanguageVariant(itemId: string, languageId: string) {
  try {
    const response = await axios.put(`${config.baseUrl}/${config.projectId}/items/${itemId}/variants/codename/${languageId}/publish`, {}, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error publishing language variant: ${error}`);
    throw error;
  }
}

type CsvRow = Record<string, string>;

function mapCsvRowToElements(row: CsvRow, languageColumn: string) {
  return [{
    element: { codename: "title" },
    value: row[languageColumn] || row["default"] || "",
    languageColumn
  }];
}

function getLanguageId(languageCode: string): string | undefined {
  console.log("🚀 ~ getLanguageId ~ languageMap[languageCode]:",languageCode, languageMap[languageCode])
  return languageMap[languageCode];
}

async function processCsvFile(filePath: string) {
  console.log(`Processing CSV file: ${filePath}`);
  const results: CsvRow[] = [];
  const languages = Object.keys(languageMap);
  
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ headers: languages }))
      .on("data", (row: CsvRow) => results.push(row))
      .on("end", async () => {
        try {
          console.log(`CSV file loaded, processing ${results.length} rows`);
          for (let i = 1; i < results.length; i++) {
            const row = results[i];
            console.log("🚀 ~ .on ~ row:", row)
            const itemName = row.default || `Item_${results.indexOf(row) + 1}`;
            const itemCodename = `major_market_list_${itemName.replace(/[- &]/g, "_").toLowerCase()}`;
            
            if (await findContentItem(itemCodename)) continue;
            
            // const contentItem = { id: 'aaaaaaa' };
            // const contentItem = await createContentItem(itemName, itemCodename);
            for (const language of languages) {
              console.log("🚀 ~ .on ~ language:", language)
              const languageId = getLanguageId(language);
              console.log("🚀 ~ .on ~ languageId:", languageId)
              if (!languageId) continue;
              
              const elements = mapCsvRowToElements(row, language);
              console.log("🚀 ~ .on ~ elements:", elements)
              // await addLanguageVariant(contentItem.id, languageId, elements);
              // await publishLanguageVariant(contentItem.id, languageId);
            }
          }
          console.log("CSV processing completed successfully");
          resolve();
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

export default processCsvFile;
// async function main() {
//   try {
//     const csvFilePath = process.env.CSV_FILE_PATH || "./test.csv";
//     await processCsvFile(csvFilePath);
//   } catch (error) {
//     console.error(`Script execution failed: ${error.message}`);
//     process.exit(1);
//   }
// }

// main();
