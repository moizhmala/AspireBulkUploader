import { JSX, useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Upload, X } from "lucide-react";

// Define our TypeScript interfaces
interface FileType {
  name: string;
  codename: string;
}

interface UnprocessedRecord {
  name: string;
  reason: string;
}

interface UploadResponse {
  message: string;
  processedCount: number;
  unprocessedCount: number;
  unprocessedRecords: UnprocessedRecord[];
}

interface ApiTypesResponse {
  types: FileType[];
}

export default function Home(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [environment, setEnvironment] = useState<string>("dev");
  const [types, setTypes] = useState<FileType[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errors, setErrors] = useState<string | null>(null);
  const [fetchingTypes, setFetchingTypes] = useState<boolean>(true);

  // Fetch types from internal API
  useEffect(() => {
    const fetchTypes = async (): Promise<void> => {
      setFetchingTypes(true);
      try {
        const response = await fetch("/api/types");
        if (!response.ok) {
          throw new Error("Failed to fetch types");
        }
        const data: ApiTypesResponse = await response.json();
        setTypes(data.types || []);
      } catch (error: unknown) {
        console.error("Error fetching types:", error);
        setErrors("Failed to load file types. Please refresh the page.");
      } finally {
        setFetchingTypes(false);
      }
    };

    fetchTypes();
  }, []);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setErrors(null);
    }
  };

  const validateInputs = (): boolean => {
    if (!file) {
      setErrors("Please select a file.");
      return false;
    }

    if (!selectedType) {
      setErrors("Please select a type.");
      return false;
    }

    const selectedTypeObj: FileType | undefined = types.find(
      (t: FileType) => t.codename === selectedType
    );
    if (!selectedTypeObj) {
      setErrors("Invalid type selected.");
      return false;
    }

    if (file.name !== `${selectedTypeObj.codename}.csv`) {
      setErrors(`Filename must be "${selectedTypeObj.codename}.csv".`);
      return false;
    }

    return true;
  };

  const handleUpload = async (): Promise<void> => {
    // Reset previous results
    setUploadResult(null);
    setErrors(null);

    if (!validateInputs()) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file as File);
    formData.append("environment", environment);
    formData.append("type", selectedType);

    setLoading(true);
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors(result.message || "Error uploading file.");
      } else {
        setUploadResult(result as UploadResponse);
      }
    } catch (error: unknown) {
      console.error("Error uploading file", error);
      setErrors("Error uploading file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (): void => {
    setFile(null);
    setSelectedType("");
    setUploadResult(null);
    setErrors(null);
    // Reset file input by recreating it
    const fileInput = document.getElementById(
      "fileInput"
    ) as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // const getSelectedTypeName = (): string => {
  //   const type: FileType | undefined = types.find(
  //     (t: FileType) => t.codename === selectedType
  //   );
  //   return type ? type.name : selectedType;
  // };

  const handleResetKeepEnvironment = (): void => {
    // Keep environment selected but reset everything else
    setFile(null);
    setSelectedType("");
    setUploadResult(null);
    setErrors(null);
    // Reset file input
    const fileInput = document.getElementById(
      "fileInput"
    ) as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">CSV Data Upload</h2>

      <div className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium" htmlFor="fileInput">
              Upload CSV File
            </label>
            {file && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">{file.name}</span>
                <button
                  onClick={(): void => setFile(null)}
                  className="text-gray-500 hover:text-red-500"
                  title="Remove file"
                  type="button"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <label
            htmlFor="fileInput"
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              file
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            <Upload
              className={file ? "text-green-500" : "text-gray-400"}
              size={32}
            />
            <span className="mt-2 text-sm text-gray-600">
              {file ? file.name : "Click to select a CSV file or drag and drop"}
            </span>
            <input
              id="fileInput"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Configuration Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Environment Selection */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="environmentSelect"
            >
              Environment
            </label>
            <select
              id="environmentSelect"
              value={environment}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                setEnvironment(e.target.value)
              }
              className="border p-2 rounded w-full bg-white"
            >
              <option value="dev">Development</option>
              <option value="prod">Production</option>
            </select>
          </div>

          {/* Type Selection */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="typeSelect"
            >
              File Type
            </label>
            <select
              id="typeSelect"
              value={selectedType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                setSelectedType(e.target.value)
              }
              className="border p-2 rounded w-full bg-white"
              disabled={fetchingTypes || types.length === 0}
            >
              <option value="">Select a type</option>
              {types.map((type: FileType) => (
                <option key={type.codename} value={type.codename}>
                  {type.name} ({type.codename})
                </option>
              ))}
            </select>
            {fetchingTypes && (
              <p className="text-xs text-gray-500 mt-1">Loading types...</p>
            )}
            {!fetchingTypes && types.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                No file types available
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errors && (
          <div
            className="flex items-center p-3 bg-red-50 border border-red-200 rounded text-red-800"
            role="alert"
          >
            <AlertCircle size={20} className="text-red-500 mr-2" />
            <p className="text-sm">{errors}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-500 text-white rounded flex-grow transition-colors hover:bg-blue-600 disabled:bg-gray-300"
            disabled={loading || !file || !selectedType}
            type="button"
          >
            {loading ? "Uploading..." : "Upload File"}
          </button>

          <button
            onClick={resetForm}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            disabled={loading}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Results Section */}
      {uploadResult && (
        <div className="mt-8 border-t pt-6">
          <div className="flex items-center mb-4">
            <CheckCircle size={24} className="text-green-500 mr-2" />
            <h3 className="text-xl font-semibold">Upload Complete</h3>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
            <p>{uploadResult.message}</p>
            <div className="flex space-x-8 mt-2">
              <div>
                <span className="text-sm text-gray-600">Processed:</span>
                <span className="ml-2 font-semibold">
                  {uploadResult.processedCount} records
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Unprocessed:</span>
                <span
                  className={`ml-2 font-semibold ${
                    uploadResult.unprocessedCount > 0
                      ? "text-orange-600"
                      : "text-green-600"
                  }`}
                >
                  {uploadResult.unprocessedCount} records
                </span>
              </div>
            </div>
          </div>

          {uploadResult.unprocessedCount > 0 &&
            uploadResult.unprocessedRecords && (
              <div>
                <h4 className="font-medium mb-2">Unprocessed Records:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {uploadResult.unprocessedRecords.map(
                        (record: UnprocessedRecord, index: number) => (
                          <tr key={index} className="bg-white">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {record.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-red-600">
                              {record.reason}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          <div className="flex justify-between mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              type="button"
            >
              Upload Another File
            </button>

            <button
              onClick={handleResetKeepEnvironment}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              type="button"
            >
              Keep Environment, Reset Other Fields
            </button>
          </div>
        </div>
      )}

      {/* Info Block */}
      {/* <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <p className="font-medium mb-1">File Name Requirements:</p>
        <p>
          The filename must match the selected type codename (e.g., "
          {selectedType ? `${selectedType}.csv` : "typename.csv"}"). If you
          selected {selectedType ? getSelectedTypeName() : "a type"}, your file
          should be named{" "}
          {selectedType ? `"${selectedType}.csv"` : '"typename.csv"'}.
        </p>
      </div> */}
    </div>
  );
}
