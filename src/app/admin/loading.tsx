export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div className="space-y-2">
          <div className="h-10 w-80 bg-muted rounded-xl animate-pulse"></div>
          <div className="h-4 w-64 bg-muted/60 rounded-lg animate-pulse"></div>
        </div>
        <div className="h-12 w-48 bg-card border border-border rounded-xl animate-pulse"></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 bg-card border border-border rounded-[2rem] animate-pulse"></div>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 h-96 bg-card border border-border rounded-[2rem] animate-pulse"></div>
        <div className="col-span-3 h-96 bg-card border border-border rounded-[2rem] animate-pulse"></div>
      </div>
    </div>
  );
}
