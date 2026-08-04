import { AppProvider } from "./store/useStore";
import AppShell from "./components/layout/AppShell";

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
