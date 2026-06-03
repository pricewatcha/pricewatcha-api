import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const READ_ONLY_TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
  idempotentHint: true,
};

export const TRACK_PRODUCT_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
  idempotentHint: false,
};

const jobOutcomeErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    http_status: z.number().nullable().optional(),
    retry_recommended: z.boolean(),
    retry_after_seconds: z.number().nullable().optional(),
  })
  .passthrough();

const jobProductSchema = z
  .object({
    product_id: z.string(),
    name: z.string(),
    shop: z.string(),
    product_url: z.string().optional(),
    currency: z.string(),
    current_price: z.number().nullable().optional(),
    status: z.string().optional(),
    last_checked_at: z.string().nullable().optional(),
  })
  .passthrough();

export const jobStatusOutputSchema = z
  .object({
    job_id: z.string(),
    status: z.enum(["queued", "running", "completed", "failed"]),
    product: jobProductSchema.nullable().optional(),
    error: jobOutcomeErrorSchema.nullable().optional(),
    hint: z.string().optional(),
  })
  .passthrough();

export const getApiStatusOutputSchema = z
  .object({
    base_url: z.string(),
    health: z
      .object({
        status: z.string(),
        service: z.string(),
        version: z.string(),
      })
      .passthrough(),
    api: z
      .object({
        name: z.string(),
        version: z.string(),
        status: z.string(),
        description: z.string().optional(),
        agent_ready: z.boolean().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const getProductOutputSchema = z
  .object({
    product_id: z.string(),
    name: z.string(),
    shop: z.string(),
    product_url: z.string().optional(),
    currency: z.string(),
    current_price: z.number().nullable().optional(),
    status: z.string().optional(),
    last_checked_at: z.string().nullable().optional(),
    preview: z.boolean().optional(),
  })
  .passthrough();

export const getPriceHistoryOutputSchema = z
  .object({
    product_id: z.string(),
    currency: z.string(),
    current_price: z.number().nullable().optional(),
    historical_low: z.number().nullable().optional(),
    historical_high: z.number().nullable().optional(),
    average_price: z.number().nullable().optional(),
    trend: z.enum(["upward", "downward", "stable", "unknown"]).optional(),
    data_points: z.array(
      z.object({
        date: z.string(),
        price: z.number(),
      }),
    ),
    preview: z.boolean().optional(),
  })
  .passthrough();

export const searchProductsOutputSchema = z
  .object({
    query: z.string(),
    count: z.number().int(),
    results: z.array(
      z
        .object({
          product_id: z.string(),
          name: z.string(),
          shop: z.string(),
          product_url: z.string().nullable().optional(),
          current_price: z.number().nullable().optional(),
          currency: z.string().optional(),
          status: z.string().optional(),
          preview: z.boolean().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
