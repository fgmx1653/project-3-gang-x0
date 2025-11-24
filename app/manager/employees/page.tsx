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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
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
      String(emp.username || "")
        .toLowerCase()
        .includes(s) ||
      String(emp.name || "")
        .toLowerCase()
        .includes(s) ||
      String(emp.email || "")
        .toLowerCase()
        .includes(s)
    );
  });

  const handleChange = (idx: number, key: string, value: any) => {
    setEmployees((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  const addEmployee = async () => {
    const newEmp: Employee = {
      username: "new_user",
      password: "",
      ismanager: false,
      employdate: new Date().toISOString().slice(0, 10),
      hrsalary: 0,
      email: "",
      google_id: "",
      name: "",
    };
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Create failed");
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

  const saveEmployee = async (emp: Employee, idx: number) => {
    try {
      const payload: any = { ...emp };
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");
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

            {error && <div className="text-destructive">{error}</div>}
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
                            handleChange(listIndex, "username", e.target.value)
                          }
                          placeholder="username"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={emp.password ?? ""}
                          onChange={(e) =>
                            handleChange(listIndex, "password", e.target.value)
                          }
                          placeholder="password"
                        />
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
                      <Input
                        value={emp.name ?? ""}
                        onChange={(e) =>
                          handleChange(listIndex, "name", e.target.value)
                        }
                        placeholder="Full name"
                      />
                      <Input
                        value={emp.email ?? ""}
                        onChange={(e) =>
                          handleChange(listIndex, "email", e.target.value)
                        }
                        placeholder="email"
                      />
                      <Input
                        value={emp.google_id ?? ""}
                        onChange={(e) =>
                          handleChange(listIndex, "google_id", e.target.value)
                        }
                        placeholder="google id"
                      />
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
