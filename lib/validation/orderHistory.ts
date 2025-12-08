import { z } from "zod";

// Constants for order history validation
export const ORDER_HISTORY_LIMITS = {
  MAX_LIMIT: 500,
  DEFAULT_LIMIT: 100,
  MIN_LIMIT: 1,
  MAX_DATE_RANGE_DAYS: 365,
  MAX_OFFSET: 100000, // Prevent offset abuse
} as const;

// Date and time regex patterns
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

/**
 * Validates that a time string is in valid 24-hour format (00:00-23:59)
 */
function validateTime24Hour(time: string): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Backend query schema for order history API
 * All fields are optional - missing fields will use defaults
 */
export const orderHistoryQuerySchema = z.object({
  start: z.string()
    .regex(dateRegex, "Date must be in YYYY-MM-DD format")
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date")
    .optional(),

  end: z.string()
    .regex(dateRegex, "Date must be in YYYY-MM-DD format")
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date")
    .optional(),

  timeStart: z.string()
    .regex(timeRegex, "Time must be in HH:MM format")
    .refine(validateTime24Hour, "Time must be valid 24-hour format (00:00-23:59)")
    .optional(),

  timeEnd: z.string()
    .regex(timeRegex, "Time must be in HH:MM format")
    .refine(validateTime24Hour, "Time must be valid 24-hour format (00:00-23:59)")
    .optional(),

  employee: z.coerce.number()
    .int("Employee ID must be an integer")
    .positive("Employee ID must be positive")
    .optional(),

  menu: z.coerce.number()
    .int("Menu item ID must be an integer")
    .positive("Menu item ID must be positive")
    .optional(),

  limit: z.coerce.number()
    .int("Limit must be an integer")
    .min(ORDER_HISTORY_LIMITS.MIN_LIMIT, `Limit must be at least ${ORDER_HISTORY_LIMITS.MIN_LIMIT}`)
    .max(ORDER_HISTORY_LIMITS.MAX_LIMIT, `Limit cannot exceed ${ORDER_HISTORY_LIMITS.MAX_LIMIT}`)
    .default(ORDER_HISTORY_LIMITS.DEFAULT_LIMIT),

  offset: z.coerce.number()
    .int("Offset must be an integer")
    .min(0, "Offset cannot be negative")
    .max(ORDER_HISTORY_LIMITS.MAX_OFFSET, "Offset exceeds maximum allowed")
    .default(0),
}).superRefine((data, ctx) => {
  // Cross-field validations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validate future dates
  if (data.start && new Date(data.start) > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start date cannot be in the future",
      path: ["start"],
    });
  }

  if (data.end && new Date(data.end) > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date cannot be in the future",
      path: ["end"],
    });
  }

  // Validate date range
  if (data.start && data.end && data.start > data.end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start date cannot be after end date",
      path: ["start"],
    });
  }

  // Validate date range length
  if (data.start && data.end) {
    const daysDiff = Math.floor(
      (new Date(data.end).getTime() - new Date(data.start).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > ORDER_HISTORY_LIMITS.MAX_DATE_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${ORDER_HISTORY_LIMITS.MAX_DATE_RANGE_DAYS} days`,
        path: ["end"],
      });
    }
  }
});

/**
 * Frontend form schema (stricter, all fields required)
 * Note: Cannot use .extend() on schemas with .superRefine(), so we define it separately
 * Note: Using z.number() instead of z.coerce.number() to avoid type inference issues with react-hook-form
 */
export const orderHistoryFormSchema = z.object({
  // Required fields on frontend
  start: z.string()
    .min(1, "Start date is required")
    .regex(dateRegex, "Date must be in YYYY-MM-DD format")
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date"),

  end: z.string()
    .min(1, "End date is required")
    .regex(dateRegex, "Date must be in YYYY-MM-DD format")
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date"),

  timeStart: z.string()
    .min(1, "Start time is required")
    .regex(timeRegex, "Time must be in HH:MM format")
    .refine(validateTime24Hour, "Time must be valid 24-hour format (00:00-23:59)"),

  timeEnd: z.string()
    .min(1, "End time is required")
    .regex(timeRegex, "Time must be in HH:MM format")
    .refine(validateTime24Hour, "Time must be valid 24-hour format (00:00-23:59)"),

  employee: z.number()
    .int("Employee ID must be an integer")
    .positive("Employee ID must be positive")
    .optional(),

  menu: z.number()
    .int("Menu item ID must be an integer")
    .positive("Menu item ID must be positive")
    .optional(),

  limit: z.number()
    .int("Limit must be an integer")
    .min(ORDER_HISTORY_LIMITS.MIN_LIMIT, `Limit must be at least ${ORDER_HISTORY_LIMITS.MIN_LIMIT}`)
    .max(ORDER_HISTORY_LIMITS.MAX_LIMIT, `Limit cannot exceed ${ORDER_HISTORY_LIMITS.MAX_LIMIT}`),

  offset: z.number()
    .int("Offset must be an integer")
    .min(0, "Offset cannot be negative")
    .max(ORDER_HISTORY_LIMITS.MAX_OFFSET, "Offset exceeds maximum allowed"),
}).superRefine((data, ctx) => {
  // Same cross-field validations as backend schema
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validate future dates
  if (data.start && new Date(data.start) > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start date cannot be in the future",
      path: ["start"],
    });
  }

  if (data.end && new Date(data.end) > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date cannot be in the future",
      path: ["end"],
    });
  }

  // Validate date range
  if (data.start && data.end && data.start > data.end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start date cannot be after end date",
      path: ["start"],
    });
  }

  // Validate date range length
  if (data.start && data.end) {
    const daysDiff = Math.floor(
      (new Date(data.end).getTime() - new Date(data.start).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > ORDER_HISTORY_LIMITS.MAX_DATE_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${ORDER_HISTORY_LIMITS.MAX_DATE_RANGE_DAYS} days`,
        path: ["end"],
      });
    }
  }
});

// Type inference from schemas
export type OrderHistoryQuery = z.infer<typeof orderHistoryQuerySchema>;
export type OrderHistoryFormData = z.infer<typeof orderHistoryFormSchema>;

/**
 * Get default values for the order history form (last 7 days)
 */
export function getDefaultQueryValues(): OrderHistoryFormData {
  const today = new Date();
  const weekAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000);

  // Format dates in local timezone to avoid UTC conversion issues
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatLocalDate(weekAgo),
    end: formatLocalDate(today),
    timeStart: "00:00",
    timeEnd: "23:59",
    employee: undefined,
    menu: undefined,
    limit: ORDER_HISTORY_LIMITS.DEFAULT_LIMIT,
    offset: 0,
  };
}

/**
 * Structured error response type for validation errors
 */
export type ValidationErrorResponse = {
  ok: false;
  error: string;
  field?: string;
  details?: Array<{
    path: string[];
    message: string;
  }>;
};
