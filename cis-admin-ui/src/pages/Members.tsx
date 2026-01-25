import { useState } from "react"
import AddMemberModal from "../components/AddMemberModal"

type MemberStatus = "ACTIVE" | "DISABLED"
type Level = "OWNER" | "ADMIN" | "STAFF"

interface Member {
  id: string
  name: string
  email: string
  level: Level
  permissionSet: string
  status: MemberStatus
}

const mockMembers: Member[] = [
  {
    id: "1",
    name: "System Admin",
    email: "admin@alisan.com",
    level: "OWNER",
    permissionSet: "ADMIN",
    status: "ACTIVE",
  },
  {
    id: "2",
    name: "Sales Lead",
    email: "sales@alisan.com",
    level: "ADMIN",
    permissionSet: "ADMIN",
    status: "ACTIVE",
  },
  {
    id: "3",
    name: "Staff User",
    email: "staff@alisan.com",
    level: "STAFF",
    permissionSet: "BASIC",
    status: "ACTIVE",
  },
]

export default function Members() {
  const [members, setMembers] = useState<Member[]>(mockMembers)
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm font-medium"
        >
          + Add Member
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Level</th>
              <th className="text-left px-4 py-3">Permission Set</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-zinc-800 hover:bg-zinc-800/40"
              >
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3 text-zinc-400">{member.email}</td>

                <td className="px-4 py-3">
                  <LevelBadge level={member.level} />
                </td>

                <td className="px-4 py-3">{member.permissionSet}</td>

                <td className="px-4 py-3">
                  <StatusBadge status={member.status} />
                </td>

                <td className="px-4 py-3 text-right">
                  <button className="text-zinc-400 hover:text-white text-xs">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddMemberModal
          onClose={() => setShowModal(false)}
          onAdd={(member) => setMembers((prev) => [...prev, member])}
        />
      )}
    </div>
  )
}

/* ---------- Small UI Components ---------- */

function LevelBadge({ level }: { level: Level }) {
  const styles: Record<Level, string> = {
    OWNER: "bg-yellow-900 text-yellow-300",
    ADMIN: "bg-blue-900 text-blue-300",
    STAFF: "bg-zinc-700 text-zinc-300",
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[level]}`}>
      {level}
    </span>
  )
}

function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        status === "ACTIVE"
          ? "bg-emerald-900 text-emerald-300"
          : "bg-zinc-700 text-zinc-300"
      }`}
    >
      {status}
    </span>
  )
}
