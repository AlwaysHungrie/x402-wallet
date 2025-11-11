import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import log from "electron-log";

export interface ApiConfig {
  id: string;
  name: string; // Tool name
  endpoint: string;
  method: "GET";
  queryParamsSchema: string; // Zod schema as string
  outputSchema: string; // Zod schema as string
  description: string;
}

export interface ApiConfigs {
  configs: ApiConfig[];
}

// File path for storing API configs
const getStoragePath = (): string => {
  return path.join(app.getPath("userData"), "api-configs.json");
};

export async function getApiConfigs(): Promise<ApiConfigs | null> {
  try {
    const storagePath = getStoragePath();

    // Check if the storage file exists
    try {
      await fs.access(storagePath);
    } catch {
      // File doesn't exist, return null
      return null;
    }

    // Read the configs from file
    const configsJson = await fs.readFile(storagePath, "utf-8");
    
    console.log("Successfully retrieved API configs");
    return JSON.parse(configsJson) as ApiConfigs;
  } catch (error) {
    log.error("Error retrieving API configs:", error);
    console.error("Error retrieving API configs:", error);
    throw error;
  }
}

export async function saveApiConfigs(configs: ApiConfigs): Promise<void> {
  try {
    const storagePath = getStoragePath();
    console.log("Storage path:", storagePath);
    
    // Ensure the userData directory exists
    const userDataDir = app.getPath("userData");
    console.log("User data directory:", userDataDir);
    await fs.mkdir(userDataDir, { recursive: true });
    
    // Validate configs structure
    if (!configs || typeof configs !== "object") {
      throw new Error("Invalid configs: must be an object");
    }
    if (!Array.isArray(configs.configs)) {
      throw new Error("Invalid configs: configs.configs must be an array");
    }
    
    // Write the configs to file as JSON
    const jsonContent = JSON.stringify(configs, null, 2);
    await fs.writeFile(storagePath, jsonContent, "utf-8");
    
    console.log("Successfully saved API configs to:", storagePath);
    log.info("Successfully saved API configs");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Error saving API configs:", error);
    console.error("Error saving API configs:", errorMessage, error);
    throw new Error(`Failed to save API configs: ${errorMessage}`);
  }
}

