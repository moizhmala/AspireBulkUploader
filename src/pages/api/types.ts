import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import getKontentConfig from "@/utils/config";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const config = getKontentConfig();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Fetch data from Kontent.ai API
    const response = await axios.get(
      `${config.baseUrl}/${config.projectId}/types`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    const data = response.data;

    // Filter types that contain "list" in their name
    const filteredTypes = data.types
      .filter((type: { name: string }) =>
        type.name.toLowerCase().includes("list")
      )
      .map((type: { name: string; codename: string }) => ({
        name: type.name,
        codename: type.codename,
      }));

    return res.status(200).json({ types: filteredTypes });
  } catch (error) {
    console.error("Error fetching types:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
