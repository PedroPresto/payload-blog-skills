import { getPayload } from "payload";
import config from "@payload-config";

let cached: Promise<Awaited<ReturnType<typeof getPayload>>> | null = null;

export const getPayloadInstance = () => {
  if (!cached) cached = getPayload({ config });
  return cached;
};
