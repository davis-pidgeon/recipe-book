import Sidebar from "./Sidebar";
import BottomTabs from "./BottomTabs";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <BottomTabs />
    </div>
  );
}
