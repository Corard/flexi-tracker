import { FlexiTracker } from "@/components/flexi-tracker";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="flexi-tracker-theme">
        <FlexiTracker />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
