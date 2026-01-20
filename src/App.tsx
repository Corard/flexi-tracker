import { FlexiTracker } from "@/components/flexi-tracker";
import { ThemeProvider } from "@/components/theme-provider";

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="flexi-tracker-theme">
      <FlexiTracker />
    </ThemeProvider>
  );
}

export default App;
