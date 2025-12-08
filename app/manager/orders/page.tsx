"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  orderHistoryFormSchema,
  getDefaultQueryValues,
  ORDER_HISTORY_LIMITS,
  type OrderHistoryFormData,
  type ValidationErrorResponse,
} from "@/lib/validation/orderHistory";

type OrderRow = {
  order_id: number;
  order_date: string;
  order_time: string;
  menu_item_id: number;
  menu_item_name: string | null;
  price: number;
  employee: number;
};

export default function OrdersHistoryPage() {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  // React Hook Form setup
  const form = useForm<OrderHistoryFormData>({
    resolver: zodResolver(orderHistoryFormSchema),
    defaultValues: getDefaultQueryValues(),
    mode: "onChange", // Validate on change for real-time feedback
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [items, setItems] = useState<OrderRow[]>([]);
  const [count, setCount] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);
  const [autoCorrections, setAutoCorrections] = useState<string[]>([]);

  async function load(data: OrderHistoryFormData) {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setFieldErrors({});
    setAutoCorrections([]);

    try {
      const params = new URLSearchParams();

      // Always include required fields
      params.set("start", data.start);
      params.set("end", data.end);
      params.set("timeStart", data.timeStart);
      params.set("timeEnd", data.timeEnd);

      // Include optional fields if provided
      if (data.employee) params.set("employee", String(data.employee));
      if (data.menu) params.set("menu", String(data.menu));
      params.set("limit", String(data.limit));
      params.set("offset", String(data.offset));

      const res = await fetch(`/api/trends/orders?${params.toString()}`, {
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      const responseData = await res.json();

      // Handle validation errors from backend
      if (!res.ok) {
        if (res.status === 400 && 'field' in responseData) {
          const validationError = responseData as ValidationErrorResponse;

          // Set field-specific error
          if (validationError.field) {
            setFieldErrors({ [validationError.field]: validationError.error });
            form.setError(validationError.field as any, {
              message: validationError.error,
            });
          }

          // Set general error with all details
          if (validationError.details && validationError.details.length > 1) {
            const errorSummary = validationError.details
              .map(d => `${d.path.join('.')}: ${d.message}`)
              .join('; ');
            setError(errorSummary);
          } else {
            setError(validationError.error);
          }

          return;
        }

        throw new Error(responseData.error || "Failed to load orders");
      }

      if (!responseData.ok) {
        throw new Error(responseData.error || "Failed to load orders");
      }

      setItems(responseData.items || []);
      setCount(responseData.count || 0);
      setRevenue(responseData.revenue || 0);

      // Show any auto-corrections that were applied
      const corrections: string[] = [];
      if (responseData.start !== data.start) {
        corrections.push(`Start date adjusted to ${responseData.start}`);
      }
      if (responseData.end !== data.end) {
        corrections.push(`End date adjusted to ${responseData.end}`);
      }
      setAutoCorrections(corrections);

    } catch (e: any) {
      if (e.name === 'AbortError') {
        return; // Silently ignore aborted requests
      }
      setError(e?.message || "Error loading orders");
    } finally {
      setLoading(false);
    }
  }

  // Form submission handler
  const onSubmit = (data: OrderHistoryFormData) => {
    load(data);
  };

  // Initial load
  useEffect(() => {
    load(form.getValues());
  }, []);

  function exportCSV() {
    const header = ["order_id","order_date","order_time","menu_item_id","menu_item_name","price","employee"];
    const rows = items.map(r => [
      r.order_id,
      r.order_date,
      r.order_time,
      r.menu_item_id,
      r.menu_item_name ?? "",
      r.price,
      r.employee,
    ]);
    const csv = [header, ...rows]
      .map(line => line.map(v => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const formValues = form.getValues();
    a.href = url;
    a.download = `orders_${formValues.start}_${formValues.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pageFrom = form.getValues('offset') + 1;
  const pageTo = Math.min(form.getValues('offset') + form.getValues('limit'), count);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl font-semibold">Order History</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button className="gap-2" onClick={() => load(form.getValues())}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Auto-corrections banner */}
                {autoCorrections.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800 font-medium mb-1">
                      Auto-corrections applied:
                    </p>
                    <ul className="text-xs text-blue-700 list-disc list-inside">
                      {autoCorrections.map((correction, i) => (
                        <li key={i}>{correction}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Date and Time Fields */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <FormField
                    control={form.control}
                    name="start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            max={new Date().toISOString().slice(0, 10)}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            max={new Date().toISOString().slice(0, 10)}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Optional Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="employee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee ID (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 3"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? undefined : Number(val));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="menu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menu Item ID (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 17"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? undefined : Number(val));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pagination */}
                <div className="flex gap-3 items-end flex-wrap">
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Results per page</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="w-32"
                            min={ORDER_HISTORY_LIMITS.MIN_LIMIT}
                            max={ORDER_HISTORY_LIMITS.MAX_LIMIT}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="offset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start from row</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="w-32"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!form.formState.isValid || loading}
                    >
                      Apply Filters
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset(getDefaultQueryValues());
                        load(getDefaultQueryValues());
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Error banner */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-8 text-sm">
              <div><span className="font-semibold">Orders:</span> {count}</div>
              <div><span className="font-semibold">Revenue:</span> ${revenue.toFixed(2)}</div>
              <div className="opacity-70">Showing {items.length ? `${pageFrom}-${pageTo}` : "0"} of {count}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Orders (detail)</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No orders found for the selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="pr-4">Order ID</th>
                      <th className="pr-4">Date</th>
                      <th className="pr-4">Time</th>
                      <th className="pr-4">Menu ID</th>
                      <th className="pr-4">Menu Name</th>
                      <th className="pr-4">Price</th>
                      <th className="pr-4">Employee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={`${r.order_id}-${r.order_time}-${r.menu_item_id}`}>
                        <td className="pr-4">{r.order_id}</td>
                        <td className="pr-4">{r.order_date}</td>
                        <td className="pr-4">{r.order_time}</td>
                        <td className="pr-4">{r.menu_item_id}</td>
                        <td className="pr-4">{r.menu_item_name ?? "-"}</td>
                        <td className="pr-4">${(r.price ?? 0).toFixed(2)}</td>
                        <td className="pr-4">{r.employee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}