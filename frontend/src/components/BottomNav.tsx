import { NavLink } from "react-router-dom";

const items = [
  { to: "/profile", label: "Profil" },
  { to: "/groups", label: "Gruppen" },
  { to: "/more", label: "Mehr" },
];

const baseItem =
  "flex-1 rounded-md py-2 text-center text-sm font-semibold transition-colors";
const activeItem = "bg-slate-100 text-slate-900 border border-slate-200";
const inactiveItem = "text-slate-600 hover:text-slate-900";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-1.5">
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
