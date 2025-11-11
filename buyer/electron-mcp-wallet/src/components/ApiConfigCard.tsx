import { useState, useEffect } from "react";
import type { ApiConfig } from "../lib/apiConfig";

interface ApiConfigCardProps {
  config: ApiConfig;
  onUpdate: (config: ApiConfig) => void;
  onDelete: (id: string) => void;
}

export default function ApiConfigCard({
  config,
  onUpdate,
  onDelete,
}: ApiConfigCardProps) {
  const [name, setName] = useState(config.name || "");
  const [endpoint, setEndpoint] = useState(config.endpoint);
  const [queryParamsSchema, setQueryParamsSchema] = useState(
    config.queryParamsSchema
  );
  const [outputSchema, setOutputSchema] = useState(config.outputSchema || "");
  const [description, setDescription] = useState(config.description || "");

  // Sync local state when config prop changes
  useEffect(() => {
    setName(config.name || "");
    setEndpoint(config.endpoint);
    setQueryParamsSchema(config.queryParamsSchema);
    setOutputSchema(config.outputSchema || "");
    setDescription(config.description || "");
  }, [config]);

  const handleFieldChange = (
    field: keyof Pick<ApiConfig, "name" | "endpoint" | "queryParamsSchema" | "outputSchema" | "description">,
    value: string
  ) => {
    const updatedConfig: ApiConfig = {
      ...config,
      method: "GET",
      [field]: value,
    };
    onUpdate(updatedConfig);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">
          {name || endpoint || "New API"}
        </h3>
        <button
          onClick={() => onDelete(config.id)}
          className="text-gray-400 hover:text-red-500 transition-colors p-1"
          aria-label="Delete API"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-primary mb-1">
            Tool Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              handleFieldChange("name", e.target.value);
            }}
            placeholder="my-api-tool"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-primary mb-1">
            Endpoint
          </label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => {
              setEndpoint(e.target.value);
              handleFieldChange("endpoint", e.target.value);
            }}
            placeholder="https://api.example.com/endpoint"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-primary mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              handleFieldChange("description", e.target.value);
            }}
            placeholder="API description"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-primary mb-1">
            Query Params Schema (Zod)
          </label>
          <textarea
            value={queryParamsSchema}
            onChange={(e) => {
              setQueryParamsSchema(e.target.value);
              handleFieldChange("queryParamsSchema", e.target.value);
            }}
            placeholder='z.object({ param: z.string(), id: z.number() })'
            rows={6}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-primary mb-1">
            Output Schema (Zod)
          </label>
          <textarea
            value={outputSchema}
            onChange={(e) => {
              setOutputSchema(e.target.value);
              handleFieldChange("outputSchema", e.target.value);
            }}
            placeholder='z.object({ result: z.string(), data: z.any() })'
            rows={6}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>
      </div>
    </div>
  );
}

