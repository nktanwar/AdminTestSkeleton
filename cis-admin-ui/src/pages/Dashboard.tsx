import { useEffect, useState } from "react"
import { getToken } from "../lib/auth"
import { useNavigate } from "react-router-dom"

/* ---------------------------------------------
   Types
---------------------------------------------- */
type ActorType = "ADMIN" | "CHANNEL_MEMBER"

interface DecodedActor {
  sub: string
  type: ActorType
  channelId?: string
  permissionCodes?: string[]
}

interface Funnel {
  id: string
  stage: string
  ownerMemberId: string
  channelId: string
}


/* ---------------------------------------------
   JWT decode
---------------------------------------------- */
function decodeJwt(token: string): DecodedActor | null {
  try {
    const payload = token.split(".")[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

/* ---------------------------------------------
   Permission Panel
---------------------------------------------- */
function PermissionPanel({ actor }: { actor: DecodedActor }) {
  if (actor.type === "ADMIN") {
    return (
      <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-4">
        <h3 className="font-semibold text-emerald-400">
          Admin Access
        </h3>
        <p className="text-sm text-zinc-300 mt-1">
          You have full access to all system actions.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
      <h3 className="font-semibold mb-2">
        Your Permissions
      </h3>

      {actor.permissionCodes &&
      actor.permissionCodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actor.permissionCodes.map((p) => (
            <span
              key={p}
              className="px-2 py-1 text-xs rounded bg-zinc-800"
            >
              {p}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          No permissions assigned
        </p>
      )}

      



    </div>
  )
}

/* ---------------------------------------------
   Dashboard
---------------------------------------------- */
export default function Dashboard() {
  const [actor, setActor] = useState<DecodedActor | null>(null)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const navigate = useNavigate();

  useEffect(() => {
  const token = getToken()
  if (!token) return

  setActor(decodeJwt(token))

  fetch("http://localhost:8082/internal/funnels", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => res.json())
    .then(setFunnels)
    .catch(() => {})
}, [])



  useEffect(() => {
    const token = getToken()
    if (!token) return
    setActor(decodeJwt(token))
  }, [])

  if (!actor) {
    return <div>Please log in</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">
        Dashboard
      </h2>

      {/* Permission Awareness */}
      <PermissionPanel actor={actor} />

        <button
  onClick={() => navigate("/funnels/new")}
  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
>
  + Create Funnel
</button>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
  <h3 className="font-semibold mb-3">
    Recent Funnels
  </h3>





  {funnels.length === 0 ? (
    <p className="text-sm text-zinc-500">
      No funnels created yet
    </p>
  ) : (
    <table className="w-full text-sm">
      <thead className="text-[var(--text-muted)]">
        <tr>
          <th className="text-left py-1">ID</th>
          <th className="text-left py-1">Stage</th>
        </tr>
      </thead>
      <tbody>
        {funnels.slice(0, 5).map((f) => (
          <tr
  key={f.id}
  className="border-t border-[var(--border)] cursor-pointer hover:bg-zinc-800"
  onClick={() => navigate(`/funnels/${f.id}`)}
>

  

  


            <td className="py-1 font-mono text-xs">
              {f.id.slice(-6)}
            </td>
            <td className="py-1">
              {f.stage}
            </td>
            
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>


      {/* High-level stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] p-4 rounded">
          Channels: 1
        </div>

        <div className="bg-[var(--bg-card)] p-4 rounded">
          Permission Sets: 2
        </div>
      </div>
    </div>
  )
}
