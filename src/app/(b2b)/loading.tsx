export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-6 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="h-10 w-64 bg-muted rounded-xl animate-pulse"></div>
          <div className="h-4 w-48 bg-muted/60 rounded-lg animate-pulse"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-muted rounded-2xl animate-pulse"></div>
          <div className="h-14 w-40 bg-muted rounded-2xl animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 h-[280px] bg-muted rounded-3xl animate-pulse"></div>
        <div className="grid grid-cols-1 gap-4">
          <div className="h-[130px] bg-muted rounded-3xl animate-pulse"></div>
          <div className="h-[130px] bg-muted rounded-3xl animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-muted rounded-3xl animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}
