export default function TopBar({ userEmail }: { userEmail: string }) {
  return (
    <header className="h-14 shrink-0 border-b border-slate-200 bg-white">
      <div className="h-full mx-auto max-w-7xl px-6 flex items-center justify-between">
        <div className="text-sm text-slate-500">{userEmail}</div>
        <form action="/logout" method="post">
          <button
            type="submit"
            className="text-sm text-slate-700 hover:text-slate-900"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
