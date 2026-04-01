import { AuthGate } from "./features/auth/AuthGate";
import { AppShell } from "./features/layout/AppShell";

function App() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}

export default App;
