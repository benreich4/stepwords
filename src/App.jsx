import { Outlet, Link } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen w-screen bg-black text-gray-100">
      <header className="w-full px-3 py-2 border-b border-gray-800">
        <Link to="/" className="text-lg font-semibold">Stepword Puzzles – by Ben Reich</Link>
      </header>
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}