import { NavLink } from "react-router-dom";

const items = [
  { to: "/profile", label: "Profil" },
  { to: "/groups", label: "Gruppen" },
  { to: "/more", label: "Mehr" },
];

const baseItem =
  "flex-1 text-center text-sm font-semibold transition-colors py-3";
const activeItem = "text-blue-600";
const inactiveItem = "text-slate-600";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl shadow-slate-200/60">
      <div className="mx-auto flex max-w-5xl items-center px-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${baseItem} ${isActive ? activeItem : inactiveItem}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
