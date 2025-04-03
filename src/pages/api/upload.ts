// pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import dotenv from "dotenv";
import processCsvFile from "@/utils/generator";

dotenv.config();

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  const form = new IncomingForm();

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};


const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { files } = await parseForm(req);
    console.log("🚀 ~ uploadHandler ~ files:", files)

    if (!files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!uploadedFile.filepath) {
      return res.status(400).json({ message: "Invalid file upload" });
    }

    const file = uploadedFile.filepath; // Ensure `filepath` is correct for your version
    console.log("🚀 ~ uploadHandler ~ file:", file)

    await processCsvFile(file);

    return res.status(200).json({ message: "File processed successfully" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Error processing file" });
  }
};

export default uploadHandler;
