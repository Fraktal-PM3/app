export default async function HealthPage() {
  const res = await fetch("http://localhost:3000/health");
  const status = await res.json();

  return (
    <div className="p-4 font-mono">
      <h1 className="text-xl font-bold">System Health</h1>
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}