import { useState, useEffect, useRef } from "react";

export interface SchemaProperty {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description?: string;
  // For array type, what type of items
  arrayItemType?: "string" | "number" | "boolean" | "object";
  // For object type, nested properties
  properties?: SchemaProperty[];
}

interface SchemaEditorProps {
  value: string; // JSON string representation
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SchemaEditor({
  value,
  onChange,
  placeholder = "Add properties to define the schema",
}: SchemaEditorProps) {
  const [properties, setProperties] = useState<SchemaProperty[]>([]);
  const lastGeneratedJsonRef = useRef<string>("");
  const isInternalUpdateRef = useRef(false);

  // Parse JSON string to properties on mount and when value changes externally
  useEffect(() => {
    // Skip if this is an internal update (we generated this JSON)
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        if (parsed.properties && typeof parsed.properties === "object") {
          // Convert properties object to array format
          const props: SchemaProperty[] = Object.entries(parsed.properties).map(
            ([name, schema]: [string, any]) => {
              const required = parsed.required?.includes(name) ?? false;
              let type: SchemaProperty["type"] = "string";
              let arrayItemType: SchemaProperty["arrayItemType"] | undefined;

              if (schema?.type) {
                if (schema.type === "array") {
                  type = "array";
                  arrayItemType = schema.items?.type || "string";
                } else {
                  type = schema.type as SchemaProperty["type"];
                }
              }

              return {
                name,
                type,
                required,
                arrayItemType,
              };
            }
          );
          setProperties(props);
        } else {
          setProperties([]);
        }
      } else {
        setProperties([]);
      }
    } catch {
      // Invalid JSON, start with empty
      setProperties([]);
    }
  }, [value]);

  // Convert properties to JSON string whenever properties change
  useEffect(() => {
    const schemaObj = {
      type: "object",
      properties: properties.reduce((acc, prop) => {
        if (prop.name) {
          acc[prop.name] = propertyToSchemaValue(prop);
        }
        return acc;
      }, {} as Record<string, any>),
      required: properties.filter((p) => p.required && p.name).map((p) => p.name),
    };
    const jsonString = JSON.stringify(schemaObj, null, 2);
    
    // Only update if different from what we last generated
    if (jsonString !== lastGeneratedJsonRef.current) {
      lastGeneratedJsonRef.current = jsonString;
      isInternalUpdateRef.current = true;
      onChange(jsonString);
    }
  }, [properties, onChange]);

  const propertyToSchemaValue = (prop: SchemaProperty): any => {
    switch (prop.type) {
      case "string":
        return { type: "string" };
      case "number":
        return { type: "number" };
      case "boolean":
        return { type: "boolean" };
      case "array":
        const itemType = prop.arrayItemType || "string";
        return {
          type: "array",
          items: { type: itemType },
        };
      case "object":
        return {
          type: "object",
          properties: prop.properties?.reduce((acc, p) => {
            acc[p.name] = propertyToSchemaValue(p);
            return acc;
          }, {} as Record<string, any>),
        };
      default:
        return { type: "string" };
    }
  };

  const addProperty = () => {
    setProperties([
      ...properties,
      {
        name: "",
        type: "string",
        required: true,
      },
    ]);
  };

  const removeProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const updateProperty = (index: number, updates: Partial<SchemaProperty>) => {
    setProperties(
      properties.map((prop, i) => (i === index ? { ...prop, ...updates } : prop))
    );
  };

  return (
    <div className="space-y-2">
      {properties.length === 0 ? (
        <div className="text-xs text-gray-500 py-2">{placeholder}</div>
      ) : (
        properties.map((prop, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded p-2 space-y-2 bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={prop.name}
                onChange={(e) =>
                  updateProperty(index, { name: e.target.value })
                }
                placeholder="Property name"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={prop.type}
                onChange={(e) =>
                  updateProperty(
                    index,
                    { type: e.target.value as SchemaProperty["type"] }
                  )
                }
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </select>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={prop.required}
                  onChange={(e) =>
                    updateProperty(index, { required: e.target.checked })
                  }
                  className="rounded"
                />
                <span>Required</span>
              </label>
              <button
                onClick={() => removeProperty(index)}
                className="text-red-500 hover:text-red-700 p-1"
                aria-label="Remove property"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {prop.type === "array" && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Array Item Type:
                </label>
                <select
                  value={prop.arrayItemType || "string"}
                  onChange={(e) =>
                    updateProperty(
                      index,
                      { arrayItemType: e.target.value as SchemaProperty["arrayItemType"] }
                    )
                  }
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="object">Object</option>
                </select>
              </div>
            )}
          </div>
        ))
      )}
      <button
        onClick={addProperty}
        className="w-full px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-primary rounded transition-colors border border-gray-300"
      >
        + Add Property
      </button>
    </div>
  );
}

