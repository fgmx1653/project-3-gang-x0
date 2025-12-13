"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getChicagoDate } from "@/lib/timezone";

type Employee = {
  id?: number;
  username?: string;
  password?: string;
  ismanager?: boolean | number;
  employdate?: string | null;
  hrsalary?: number | null;
  email?: string | null;
  google_id?: string | null;
  name?: string | null;
  [key: string]: any;
};

export default function Page() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load");
      setEmployees(
        (data.employees || []).map((e: any) => ({
          ...e,
          id: e.id !== undefined && e.id !== null ? Number(e.id) : undefined,
          ismanager: e.ismanager === 1 || e.ismanager === true,
          employdate:
            e.employdate && String(e.employdate).length >= 10
              ? String(e.employdate).slice(0, 10)
              : null,
          hrsalary:
            e.hrsalary === null || e.hrsalary === undefined
              ? null
              : Number(e.hrsalary),
        }))
      );
    } catch (err: any) {
      setError(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = employees.filter((emp) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      String(emp.username || "").toLowerCase().includes(s) ||
      String(emp.name || "").toLowerCase().includes(s) ||
      String(emp.email || "").toLowerCase().includes(s)
    );
  });

  const clearFieldError = (idx: number, key: string) => {
    const fieldKey = `${idx}.${key}`;
    setFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const copy = { ...prev };
      delete copy[fieldKey];
      return copy;
    });
  };

  const handleChange = (idx: number, key: string, value: any) => {
    setEmployees((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
    clearFieldError(idx, key);
  };

  const addEmployee = async () => {
    setError(null);
    setFieldErrors({});
    const newEmp: Employee = {
      username: "new_user",
      password: "",
      ismanager: false,
      employdate: getChicagoDate(), // Use Chicago timezone
      hrsalary: 0,
      email: null,
      google_id: null,
      name: "",
    };
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp),
      });
      const data = await res.json();
      if (!data.ok) {
        // surface friendly message when available (e.g. email_in_use)
        setError(data.message || data.error || "Create failed");
        return;
      }
      setEmployees((prev) => [
        ...prev,
        {
          ...data.employee,
          id:
            data.employee.id !== undefined && data.employee.id !== null
              ? Number(data.employee.id)
              : undefined,
          ismanager: data.employee.ismanager === 1,
          employdate:
            data.employee.employdate &&
            String(data.employee.employdate).length >= 10
              ? String(data.employee.employdate).slice(0, 10)
              : null,
        },
      ]);
    } catch (err: any) {
      setError(err?.message || "Error creating employee");
    }
  };

  const validateEmployee = (emp: Employee, idx: number): boolean => {
    const errs: Record<string, string> = {};

    const fieldKey = (field: string) => `${idx}.${field}`;

    // Username required
    if (!emp.username || !emp.username.trim()) {
      errs[fieldKey("username")] = "Username is required.";
    }

    // Password required (for this UI)
    if (emp.password === undefined || emp.password === null || emp.password === "") {
      errs[fieldKey("password")] = "Password is required.";
    }

    // Employment date required
    if (!emp.employdate || !emp.employdate.trim()) {
      errs[fieldKey("employdate")] = "Employment date is required.";
    }

    // Hourly salary must be non-negative if provided
    if (emp.hrsalary !== null && emp.hrsalary !== undefined) {
      if (isNaN(Number(emp.hrsalary)) || Number(emp.hrsalary) < 0) {
        errs[fieldKey("hrsalary")] = "Hourly salary must be a non-negative number.";
      }
    }

    // Email basic format check (if provided)
    if (emp.email && emp.email.trim()) {
      const email = emp.email.trim();
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(email)) {
        errs[fieldKey("email")] = "Email format looks invalid.";
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errs }));
      setError("Please correct the highlighted fields before saving.");
      return false;
    }

    return true;
  };

  const saveEmployee = async (emp: Employee, idx: number) => {
    setError(null);
    setFieldErrors((prev) => {
      // Clear errors related to this index before re-validating
      const copy = { ...prev };
      Object.keys(copy).forEach((key) => {
        if (key.startsWith(`${idx}.`)) {
          delete copy[key];
        }
      });
      return copy;
    });

    // Client-side validation
    const isValid = validateEmployee(emp, idx);
    if (!isValid) return;

    try {
      const payload: any = { ...emp };
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || data.error || "Save failed");
        return;
      }
      setEmployees((prev) => {
        const copy = [...prev];
        copy[idx] = {
          ...data.employee,
          ismanager: data.employee.ismanager === 1,
        };
        return copy;
      });
    } catch (err: any) {
      setError(err?.message || "Error saving employee");
    }
  };

  const deleteEmployee = async (id?: number, idx?: number) => {
    if (id === undefined || id === null) return;
    setError(null);
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");
      if (typeof idx === "number") {
        setEmployees((prev) => prev.filter((_, i) => i !== idx));
      } else {
        fetchEmployees();
      }
    } catch (err: any) {
      setError(err?.message || "Error deleting employee");
    }
  };

  const getFieldError = (idx: number, key: string) =>
    fieldErrors[`${idx}.${key}`];

  return (
    <div className="p-6 h-screen flex flex-col">
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff</CardTitle>
            <Link href="/manager">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={addEmployee}>Add Employee</Button>
              <Button variant="outline" onClick={fetchEmployees}>
                Refresh
              </Button>
              {loading && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                >
                  Clear
                </Button>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md p-4">
            <div className="grid gap-4">
              {filtered.length === 0 && searchTerm && (
                <div className="text-center text-muted-foreground py-8">
                  No staff match "{searchTerm}"
                </div>
              )}
              {filtered.length === 0 && !searchTerm && !loading && (
                <div className="text-center text-muted-foreground py-8">
                  No staff found.
                </div>
              )}

              {filtered.map((emp, idx) => {
                const originalIdx = employees.findIndex((e) => e.id === emp.id);
                const listIndex = originalIdx >= 0 ? originalIdx : idx;
                return (
                  <div key={emp.id ?? idx} className="border rounded-lg p-3">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Input
                          value={emp.username ?? ""}
                          onChange={(e) =>
                            handleChange(
                              listIndex,
                              "username",
                              e.target.value
                            )
                          }
                          placeholder="username"
                        />
                        {getFieldError(listIndex, "username") && (
                          <p className="mt-1 text-xs text-destructive">
                            {getFieldError(listIndex, "username")}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={emp.password ?? ""}
                          onChange={(e) =>
                            handleChange(
                              listIndex,
                              "password",
                              e.target.value
                            )
                          }
                          placeholder="password"
                        />
                        {getFieldError(listIndex, "password") && (
                          <p className="mt-1 text-xs text-destructive">
                            {getFieldError(listIndex, "password")}
                          </p>
                        )}
                      </div>
                      <div className="col-span-1 flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!emp.ismanager}
                            onChange={(e) =>
                              handleChange(
                                listIndex,
                                "ismanager",
                                e.target.checked
                              )
                            }
                            className="cursor-pointer"
                          />
                          <span className="text-sm">Manager</span>
                        </label>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="date"
                          value={emp.employdate ?? ""}
                          onChange={(e) =>
                            handleChange(
                              listIndex,
                              "employdate",
                              e.target.value
                            )
                          }
                        />
                        {getFieldError(listIndex, "employdate") && (
                          <p className="mt-1 text-xs text-destructive">
                            {getFieldError(listIndex, "employdate")}
                          </p>
                        )}
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={emp.hrsalary ?? 0}
                          onChange={(e) =>
                            handleChange(
                              listIndex,
                              "hrsalary",
                              Number(e.target.value)
                            )
                          }
                        />
                        {getFieldError(listIndex, "hrsalary") && (
                          <p className="mt-1 text-xs text-destructive">
                            {getFieldError(listIndex, "hrsalary")}
                          </p>
                        )}
                      </div>
                      <div className="col-span-3 flex gap-1 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => saveEmployee(emp, listIndex)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteEmployee(emp.id, listIndex)}
                        >
                          Del
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          value={emp.name ?? ""}
                          onChange={(e) =>
                            handleChange(listIndex, "name", e.target.value)
                          }
                          placeholder="Full name"
                        />
                        {getFieldError(listIndex, "name") && (
                          <p className="mt-1 text-xs text-destructive">
                            {getFieldError(listIndex, "name")}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          value={emp.email ?? ""}
                          onChange={(e) =>
                            handleChange(listIndex, "email", e.target.value)
                          }
                          placeholder="email"
                        />
                        {getFieldError(listIndex, "email") && (
                          <p className="mt-1 text-xs text-destructive">
                            {getFieldError(listIndex, "email")}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          value={emp.google_id ?? ""}
                          onChange={(e) =>
                            handleChange(
                              listIndex,
                              "google_id",
                              e.target.value
                            )
                          }
                          placeholder="google id"
                        />
                        {getFieldError(listIndex, "google_id") && (
                          <p className="mt-1 text-xs text-destructive">
                            {getFieldError(listIndex, "google_id")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
        <CardFooter />
      </Card>
    </div>
  );
}
