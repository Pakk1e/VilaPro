import PageHeader from "../components/PageHeader";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <PageHeader title="Admin" />

      <div className="mt-6 bg-white rounded-2xl p-6 shadow">
        <p className="text-slate-500">
          Admin tools will live here.
        </p>
      </div>
    </div>
  );
}
