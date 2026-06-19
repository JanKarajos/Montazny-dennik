"use client";

import { Shield, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getUserFacingError } from "@/lib/client-error";
import type { PermissionCode, PermissionItem } from "@/lib/permissions";

type UserRow = {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string;
  permissions: string[];
};

type RoleRow = {
  id: string;
  name: string;
  permissions: string[];
};

type Props = {
  users: UserRow[];
  roles: RoleRow[];
  availablePermissions: PermissionItem[];
};

export function UserManagementClient({ users, roles, availablePermissions }: Props) {
  const router = useRouter();

  const [localUsers, setLocalUsers] = useState(users);
  const [localRoles, setLocalRoles] = useState(roles);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");

  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissionCodes, setNewRolePermissionCodes] = useState<PermissionCode[]>([]);

  const [savingUser, setSavingUser] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [activePermissionChangeKey, setActivePermissionChangeKey] = useState<string | null>(null);

  const [userError, setUserError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const permissionDescriptionByCode = useMemo(
    () => Object.fromEntries(availablePermissions.map((item) => [item.code, item.description])),
    [availablePermissions],
  );

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserError(null);

    if (!name.trim() || !email.trim() || !password.trim() || !selectedRoleId) {
      setUserError("Vyplňte všetky povinné polia.");
      return;
    }

    try {
      setSavingUser(true);
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          roleId: selectedRoleId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa vytvoriť používateľa.");
      }

      setName("");
      setEmail("");
      setPassword("");
      router.refresh();
    } catch (error) {
      setUserError(getUserFacingError(error, "Nepodarilo sa vytvoriť používateľa."));
    } finally {
      setSavingUser(false);
    }
  }

  async function handleCreateRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleError(null);

    if (!newRoleName.trim()) {
      setRoleError("Zadajte názov role.");
      return;
    }

    try {
      setSavingRole(true);
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName.trim(),
          permissionCodes: newRolePermissionCodes,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa vytvoriť rolu.");
      }

      const createdRole = (await response.json()) as RoleRow;
      setLocalRoles((previous) => [...previous, createdRole].sort((a, b) => a.name.localeCompare(b.name, "sk")));
      setSelectedRoleId(createdRole.id);
      setNewRoleName("");
      setNewRolePermissionCodes([]);
    } catch (error) {
      setRoleError(getUserFacingError(error, "Nepodarilo sa vytvoriť rolu."));
    } finally {
      setSavingRole(false);
    }
  }

  async function handlePermissionToggle(userId: string, code: PermissionCode, checked: boolean) {
    setPermissionError(null);
    const key = `${userId}:${code}`;
    setActivePermissionChangeKey(key);

    const previousUsers = localUsers;

    setLocalUsers((currentUsers) =>
      currentUsers.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        const nextPermissions = checked
          ? Array.from(new Set([...user.permissions, code]))
          : user.permissions.filter((permissionCode) => permissionCode !== code);

        return {
          ...user,
          permissions: nextPermissions,
        };
      }),
    );

    try {
      const response = await fetch(`/api/users/${userId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          enabled: checked,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa uložiť oprávnenie.");
      }

      const payload = (await response.json()) as { id: string; permissions: string[] };
      setLocalUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === payload.id ? { ...user, permissions: payload.permissions } : user)),
      );
    } catch (error) {
      setLocalUsers(previousUsers);
      setPermissionError(getUserFacingError(error, "Nepodarilo sa uložiť oprávnenie."));
    } finally {
      setActivePermissionChangeKey(null);
    }
  }

  function toggleNewRolePermission(code: PermissionCode, checked: boolean) {
    setNewRolePermissionCodes((previous) => {
      if (checked) {
        return Array.from(new Set([...previous, code]));
      }
      return previous.filter((permissionCode) => permissionCode !== code);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <UserPlus size={18} className="text-red-600" />
          Vytvoriť nový účet
        </h2>

        <form onSubmit={handleCreateUser} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Meno a priezvisko
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              placeholder="Napr. Milan Kováč"
              required
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              placeholder="meno@firma.sk"
              required
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Heslo
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              required
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Rola
            <select
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              required
            >
              {localRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          {userError ? <p className="sm:col-span-2 text-sm text-red-700">{userError}</p> : null}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingUser}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {savingUser ? "Ukladám..." : "Vytvoriť používateľa"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Vytvoriť rolu</h2>

        <form onSubmit={handleCreateRole} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Názov role
            <input
              value={newRoleName}
              onChange={(event) => setNewRoleName(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              placeholder="Napr. Vedúci montáže"
              required
            />
          </label>

          <div>
            <p className="text-sm font-medium text-gray-700">Predvolené oprávnenia role</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {availablePermissions.map((permission) => (
                <label
                  key={permission.code}
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={newRolePermissionCodes.includes(permission.code)}
                    onChange={(event) => toggleNewRolePermission(permission.code, event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  {permission.description}
                </label>
              ))}
            </div>
          </div>

          {roleError ? <p className="text-sm text-red-700">{roleError}</p> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingRole}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {savingRole ? "Ukladám..." : "Vytvoriť rolu"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-slate-900 px-4 py-3 text-white">
          <Shield size={17} />
          <h2 className="text-lg font-bold">Správa práv používateľov</h2>
        </div>

        {permissionError ? <p className="border-b border-gray-200 bg-red-50 px-4 py-2 text-sm text-red-700">{permissionError}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Meno</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Rola</th>
                <th className="px-3 py-2 font-semibold">Oprávnenia</th>
              </tr>
            </thead>
            <tbody>
              {localUsers.map((user, index) => (
                <tr key={user.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-3 text-gray-800">{user.name}</td>
                  <td className="px-3 py-3 text-gray-700">{user.email}</td>
                  <td className="px-3 py-3 text-gray-700">{user.roleName}</td>
                  <td className="px-3 py-3">
                    <div className="grid gap-2 lg:grid-cols-2">
                      {availablePermissions.map((permission) => {
                        const checked = user.permissions.includes(permission.code);
                        const key = `${user.id}:${permission.code}`;
                        const isSaving = activePermissionChangeKey === key;

                        return (
                          <label
                            key={permission.code}
                            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                handlePermissionToggle(user.id, permission.code, event.target.checked)
                              }
                              disabled={isSaving}
                              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span>{permissionDescriptionByCode[permission.code] ?? permission.code}</span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}

              {localUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    Zatiaľ nie sú evidovaní žiadni používatelia.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
