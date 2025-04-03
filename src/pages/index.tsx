// pages/index.tsx
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [environment, setEnvironment] = useState("dev");
  const [message, setMessage] = useState("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("environment", environment);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setMessage(result.message);
    } catch (error) {
      setMessage("Error uploading file");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-semibold">Upload CSV</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <select
        value={environment}
        onChange={(e) => setEnvironment(e.target.value)}
        className="border p-2 rounded"
      >
        <option value="dev">Dev</option>
        <option value="prod">Prod</option>
        <option value="all">All</option>
      </select>
      <button
        onClick={handleUpload}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Upload
      </button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}
