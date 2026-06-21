"use client";

import { KeyRound, Pencil, Shield, Trash2, UserPlus } from "lucide-react";
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
  isSystem: boolean;
  permissions: string[];
};

type Props = {
  canResetUserPasswords: boolean;
  users: UserRow[];
  roles: RoleRow[];
  availablePermissions: PermissionItem[];
};

export function UserManagementClient({ canResetUserPasswords, users, roles, availablePermissions }: Props) {
  const router = useRouter();

  const [localUsers, setLocalUsers] = useState(users);
  const [localRoles, setLocalRoles] = useState(roles);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");

  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissionCodes, setNewRolePermissionCodes] = useState<PermissionCode[]>([]);

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPermissionCodes, setEditUserPermissionCodes] = useState<PermissionCode[]>([]);
  const [editingUserSubmitting, setEditingUserSubmitting] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [deletingUserSubmitting, setDeletingUserSubmitting] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRolePermissionCodes, setEditRolePermissionCodes] = useState<PermissionCode[]>([]);
  const [editingRoleSubmitting, setEditingRoleSubmitting] = useState(false);
  const [editRoleError, setEditRoleError] = useState<string | null>(null);

  const [deletingRole, setDeletingRole] = useState<RoleRow | null>(null);
  const [deletingRoleSubmitting, setDeletingRoleSubmitting] = useState(false);
  const [deleteRoleError, setDeleteRoleError] = useState<string | null>(null);

  const [savingUser, setSavingUser] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  const [userError, setUserError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const permissionDescriptionByCode = useMemo(
    () => Object.fromEntries(availablePermissions.map((item) => [item.code, item.description])),
    [availablePermissions],
  );

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserError(null);

    if (!name.trim() || !email.trim() || !selectedRoleId) {
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
          roleId: selectedRoleId,
        }),
      });

      const payload = (await response.json()) as UserRow & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Nepodarilo sa vytvoriť používateľa.");
      }

      setLocalUsers((currentUsers) =>
        [...currentUsers, payload].sort((a, b) => a.name.localeCompare(b.name, "sk")),
      );

      setName("");
      setEmail("");
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

  function toggleNewRolePermission(code: PermissionCode, checked: boolean) {
    setNewRolePermissionCodes((previous) => {
      if (checked) {
        return Array.from(new Set([...previous, code]));
      }
      return previous.filter((permissionCode) => permissionCode !== code);
    });
  }

  function openEditUserModal(user: UserRow) {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserPermissionCodes(user.permissions.filter((permission): permission is PermissionCode => permission in permissionDescriptionByCode));
    setEditUserError(null);
  }

  function toggleEditUserPermission(code: PermissionCode, checked: boolean) {
    setEditUserPermissionCodes((previous) => {
      if (checked) {
        return Array.from(new Set([...previous, code]));
      }
      return previous.filter((permissionCode) => permissionCode !== code);
    });
  }

  async function handleEditUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) {
      return;
    }

    setEditUserError(null);

    if (!editUserName.trim() || !editUserEmail.trim()) {
      setEditUserError("Meno a email sú povinné.");
      return;
    }

    try {
      setEditingUserSubmitting(true);
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editUserName.trim(),
          email: editUserEmail.trim(),
          permissionCodes: editUserPermissionCodes,
        }),
      });

      const payload = (await response.json()) as UserRow & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Nepodarilo sa upraviť používateľa.");
      }

      setLocalUsers((currentUsers) =>
        currentUsers
          .map((user) => (user.id === payload.id ? payload : user))
          .sort((a, b) => a.name.localeCompare(b.name, "sk")),
      );
      setEditingUser(null);
      router.refresh();
    } catch (error) {
      setEditUserError(getUserFacingError(error, "Nepodarilo sa upraviť používateľa."));
    } finally {
      setEditingUserSubmitting(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deletingUser) {
      return;
    }

    setDeleteUserError(null);

    try {
      setDeletingUserSubmitting(true);
      const response = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa vymazať používateľa.");
      }

      setLocalUsers((currentUsers) => currentUsers.filter((user) => user.id !== deletingUser.id));
      setDeletingUser(null);
      router.refresh();
    } catch (error) {
      setDeleteUserError(getUserFacingError(error, "Nepodarilo sa vymazať používateľa."));
    } finally {
      setDeletingUserSubmitting(false);
    }
  }

  async function handleResetUserPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetPasswordUser) {
      return;
    }

    setResetPasswordError(null);

    if (resetPasswordValue.length < 8) {
      setResetPasswordError("Nové heslo musí mať aspoň 8 znakov.");
      return;
    }

    try {
      setResettingPassword(true);
      const response = await fetch(`/api/users/${resetPasswordUser.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPasswordValue }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa zmeniť heslo používateľa.");
      }

      setResetPasswordUser(null);
      setResetPasswordValue("");
      router.refresh();
    } catch (error) {
      setResetPasswordError(getUserFacingError(error, "Nepodarilo sa zmeniť heslo používateľa."));
    } finally {
      setResettingPassword(false);
    }
  }

  function openEditRoleModal(role: RoleRow) {
    if (role.isSystem) {
      return;
    }

    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRolePermissionCodes(role.permissions.filter((permission): permission is PermissionCode => permission in permissionDescriptionByCode));
    setEditRoleError(null);
  }

  function toggleEditRolePermission(code: PermissionCode, checked: boolean) {
    setEditRolePermissionCodes((previous) => {
      if (checked) {
        return Array.from(new Set([...previous, code]));
      }
      return previous.filter((permissionCode) => permissionCode !== code);
    });
  }

  async function handleEditRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRole) {
      return;
    }

    setEditRoleError(null);

    if (!editRoleName.trim()) {
      setEditRoleError("Zadajte názov role.");
      return;
    }

    try {
      setEditingRoleSubmitting(true);
      const response = await fetch(`/api/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editRoleName.trim(),
          permissionCodes: editRolePermissionCodes,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa upraviť rolu.");
      }

      const payload = (await response.json()) as RoleRow;
      setLocalRoles((previous) =>
        previous
          .map((role) => (role.id === payload.id ? payload : role))
          .sort((a, b) => a.name.localeCompare(b.name, "sk")),
      );
      setLocalUsers((previous) =>
        previous.map((user) => (user.roleId === payload.id ? { ...user, roleName: payload.name } : user)),
      );
      setEditingRole(null);
      router.refresh();
    } catch (error) {
      setEditRoleError(getUserFacingError(error, "Nepodarilo sa upraviť rolu."));
    } finally {
      setEditingRoleSubmitting(false);
    }
  }

  async function confirmDeleteRole() {
    if (!deletingRole) {
      return;
    }

    setDeleteRoleError(null);

    try {
      setDeletingRoleSubmitting(true);
      const response = await fetch(`/api/roles/${deletingRole.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa vymazať rolu.");
      }

      setLocalRoles((previous) => previous.filter((role) => role.id !== deletingRole.id));
      if (selectedRoleId === deletingRole.id) {
        const nextRole = localRoles.find((role) => role.id !== deletingRole.id);
        setSelectedRoleId(nextRole?.id ?? "");
      }
      setDeletingRole(null);
      router.refresh();
    } catch (error) {
      setDeleteRoleError(getUserFacingError(error, "Nepodarilo sa vymazať rolu."));
    } finally {
      setDeletingRoleSubmitting(false);
    }
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
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              placeholder="meno@manex.sk"
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

          <p className="sm:col-span-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Nový účet dostane dočasné heslo <strong>technik123</strong>. Po prvom prihlásení bude používateľ
            povinne presmerovaný na zmenu hesla.
          </p>

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
          <h2 className="text-lg font-bold">Správa používateľov</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Meno</th>
                <th className="px-3 py-2 font-semibold">E-mail</th>
                <th className="px-3 py-2 font-semibold">Rola</th>
                <th className="px-3 py-2 font-semibold">Oprávnenia</th>
                <th className="px-3 py-2 font-semibold text-right">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {localUsers.map((user, index) => (
                <tr key={user.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-3 text-gray-800">{user.name}</td>
                  <td className="px-3 py-3 text-gray-700">{user.email}</td>
                  <td className="px-3 py-3 text-gray-700">{user.roleName}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.map((code) => (
                        <span key={`${user.id}:${code}`} className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {permissionDescriptionByCode[code as PermissionCode] ?? code}
                        </span>
                      ))}
                      {user.permissions.length === 0 ? (
                        <span className="text-xs text-gray-500">Žiadne individuálne oprávnenia</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      {canResetUserPasswords ? (
                        <button
                          type="button"
                          onClick={() => {
                            setResetPasswordUser(user);
                            setResetPasswordValue("");
                            setResetPasswordError(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                        >
                          <KeyRound size={14} />
                          Zmeniť heslo
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEditUserModal(user)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        <Pencil size={14} />
                        Upraviť
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingUser(user);
                          setDeleteUserError(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Vymazať
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {localUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    Zatiaľ nie sú evidovaní žiadni používatelia.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-slate-900 px-4 py-3 text-white">
          <h2 className="text-lg font-bold">Správa rolí</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Názov</th>
                <th className="px-3 py-2 font-semibold">Typ</th>
                <th className="px-3 py-2 font-semibold">Predvolené oprávnenia</th>
                <th className="px-3 py-2 font-semibold text-right">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {localRoles.map((role, index) => (
                <tr key={role.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-3 font-medium text-gray-800">{role.name}</td>
                  <td className="px-3 py-3 text-gray-700">{role.isSystem ? "Systémová" : "Vlastná"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((code) => (
                        <span key={`${role.id}:${code}`} className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {permissionDescriptionByCode[code as PermissionCode] ?? code}
                        </span>
                      ))}
                      {role.permissions.length === 0 ? <span className="text-xs text-gray-500">Bez oprávnení</span> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditRoleModal(role)}
                        disabled={role.isSystem}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={14} />
                        Upraviť
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingRole(role);
                          setDeleteRoleError(null);
                        }}
                        disabled={role.isSystem}
                        className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Vymazať
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Upraviť používateľa</h2>
            <p className="mt-1 text-sm text-gray-600">Zmeňte meno, email a individuálne oprávnenia používateľa.</p>

            <form onSubmit={handleEditUser} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Meno a priezvisko
                  <input
                    value={editUserName}
                    onChange={(event) => setEditUserName(event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  E-mail
                  <input
                    type="email"
                    value={editUserEmail}
                    onChange={(event) => setEditUserEmail(event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                    required
                  />
                </label>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Individuálne oprávnenia</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {availablePermissions.map((permission) => (
                    <label
                      key={permission.code}
                      className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={editUserPermissionCodes.includes(permission.code)}
                        onChange={(event) => toggleEditUserPermission(permission.code, event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      {permission.description}
                    </label>
                  ))}
                </div>
              </div>

              {editUserError ? <p className="text-sm text-red-700">{editUserError}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={editingUserSubmitting}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {editingUserSubmitting ? "Ukladám..." : "Uložiť zmeny"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-300 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-red-800">Vymazať používateľa</h2>
            <p className="mt-2 text-sm text-gray-700">Naozaj chcete vymazať tohto používateľa?</p>
            <p className="mt-1 text-sm text-gray-800">
              <strong>{deletingUser.name}</strong> ({deletingUser.email})
            </p>
            <p className="mt-2 text-xs text-gray-600">Historické výkazy práce zostanú zachované ako Bývalý zamestnanec.</p>

            {deleteUserError ? <p className="mt-3 text-sm text-red-700">{deleteUserError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={deletingUserSubmitting}
                className="rounded-md border border-red-300 bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingUserSubmitting ? "Mažem..." : "Vymazať"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetPasswordUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-amber-300 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-amber-800">Zmena hesla používateľa</h2>
            <p className="mt-2 text-sm text-gray-700">
              Nastavte nové heslo pre používateľa <strong>{resetPasswordUser.name}</strong>.
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Po ďalšom prihlásení bude používateľ povinne presmerovaný na zmenu hesla.
            </p>

            <form onSubmit={handleResetUserPassword} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Nové heslo
                <input
                  type="password"
                  value={resetPasswordValue}
                  onChange={(event) => setResetPasswordValue(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  placeholder="Minimálne 8 znakov"
                  required
                />
              </label>

              {resetPasswordError ? <p className="text-sm text-red-700">{resetPasswordError}</p> : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="rounded-md border border-amber-300 bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {resettingPassword ? "Ukladám..." : "Uložiť nové heslo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingRole ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Upraviť rolu</h2>

            <form onSubmit={handleEditRole} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Názov role
                <input
                  value={editRoleName}
                  onChange={(event) => setEditRoleName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
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
                        checked={editRolePermissionCodes.includes(permission.code)}
                        onChange={(event) => toggleEditRolePermission(permission.code, event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      {permission.description}
                    </label>
                  ))}
                </div>
              </div>

              {editRoleError ? <p className="text-sm text-red-700">{editRoleError}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={editingRoleSubmitting}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {editingRoleSubmitting ? "Ukladám..." : "Uložiť zmeny"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingRole ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-300 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-red-800">Vymazať rolu</h2>
            <p className="mt-2 text-sm text-gray-700">Naozaj chcete vymazať rolu {deletingRole.name}?</p>
            <p className="mt-2 text-xs text-gray-600">Rolu je možné vymazať len keď nie je priradená žiadnemu používateľovi.</p>

            {deleteRoleError ? <p className="mt-3 text-sm text-red-700">{deleteRoleError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={confirmDeleteRole}
                disabled={deletingRoleSubmitting}
                className="rounded-md border border-red-300 bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingRoleSubmitting ? "Mažem..." : "Vymazať"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
