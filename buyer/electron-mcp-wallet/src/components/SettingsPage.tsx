import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ApiConfigCard from "./ApiConfigCard";
import type { ApiConfig, ApiConfigs } from "../lib/apiConfig";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const data = await window.electronAPI.getApiConfigs();
      if (data && data.configs) {
        // Ensure all configs have a description, outputSchema, and name field for backward compatibility
        setConfigs(
          data.configs.map((config): ApiConfig => ({
            ...config,
            name: (config as ApiConfig).name || "",
            description: (config as ApiConfig).description || "",
            outputSchema: (config as ApiConfig).outputSchema || "",
          }))
        );
      } else {
        setConfigs([]);
      }
    } catch (error) {
      console.error("Error loading API configs:", error);
      setConfigs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const apiConfigs: ApiConfigs = { configs };
      console.log("Attempting to save API configs:", apiConfigs);
      await window.electronAPI.saveApiConfigs(apiConfigs);
      // Artificial delay of 600ms
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (error) {
      console.error("Error saving API configs:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = () => {
    const newConfig: ApiConfig = {
      id: `config-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: "",
      endpoint: "",
      method: "GET",
      queryParamsSchema: "",
      outputSchema: "",
      description: "",
    };
    setConfigs([...configs, newConfig]);
  };

  const handleUpdate = (updatedConfig: ApiConfig) => {
    setConfigs(
      configs.map((config) =>
        config.id === updatedConfig.id ? updatedConfig : config
      )
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this API configuration?")) {
      setConfigs(configs.filter((config) => config.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-custom-orange flex flex-col px-6">
      <div className="flex-1 flex flex-col py-6">
        <div className="w-full max-w-2xl mx-auto space-y-4 flex-1 flex flex-col">
          {/* Heading with Back Arrow */}
          <div className="mb-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/")}
                className="hover:opacity-80 transition-opacity cursor-pointer p-1 -ml-2 align-top"
                aria-label="Go back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-primary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            </div>
            <h1 className="text-lg font-bold text-primary">
              Configure x402 api
            </h1>
            <p className="text-sm text-primary/80">
              Add any x402 api and expose it as a tool to your desktop client
            </p>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className="w-full bg-white hover:bg-gray-50 text-primary font-semibold py-3 px-6 shadow-md hover:shadow-lg transition-all duration-200 rounded-lg border-2 border-primary/20"
          >
            + Add New API
          </button>

          {/* Content area - API Configs */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="text-center text-primary/60 py-8">
                Loading...
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center text-primary/60 py-8">
                No API configurations yet. Click "Add New API" to get started.
              </div>
            ) : (
              configs.map((config) => (
                <ApiConfigCard
                  key={config.id}
                  config={config}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

