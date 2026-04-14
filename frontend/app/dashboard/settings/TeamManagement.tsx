"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function TeamManagement({ role }: { role: string }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/team", {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok) setEmployees(data);
        else toast.error("Failed to load team members");
      } catch {
        toast.error("Failed to load team members");
      } finally {
        setLoading(false);
      }
    };

    if (role === "admin" || role === "super_admin") fetchEmployees();
  }, [role]);

  const updateRole = async (empId: string, newRole: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/team/${empId}/role`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((u) => (u._id === empId ? { ...u, role: newRole } : u))
        );
        toast.success("Role updated! ✅");
      } else {
        toast.error("Failed to update role ❌");
      }
    } catch {
      toast.error("Failed to update role ❌");
    }
  };

  return (
    <div className="bg-[#0f1117] border border-gray-700 rounded-xl p-6 space-y-5">
      <h2 className="text-xl font-semibold">Team Management</h2>

      {loading && <p className="text-gray-400 animate-pulse">Loading team members...</p>}

      {!loading && employees.length === 0 && (
        <p className="text-gray-400">No employees found.</p>
      )}

      {employees.map((emp) => (
        <div
          key={emp._id}
          className="flex justify-between items-center bg-[#1a1d2e] border border-gray-600 rounded-lg px-4 py-3"
        >
          <div>
            <p className="text-white font-medium">{emp.name}</p>
            <p className="text-sm text-gray-400">{emp.email}</p>
          </div>
          <select
            value={emp.role}
            onChange={(e) => updateRole(emp._id, e.target.value)}
            className="bg-[#0f1117] border border-gray-600 text-white rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
      ))}
    </div>
  );
}