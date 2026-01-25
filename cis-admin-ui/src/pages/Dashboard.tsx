export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 p-4 rounded">Channels: 1</div>
        <div className="bg-zinc-900 p-4 rounded">Members: 4</div>
        <div className="bg-zinc-900 p-4 rounded">Permission Sets: 2</div>
      </div>
    </div>
  )
}
