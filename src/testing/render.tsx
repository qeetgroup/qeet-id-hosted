import { ThemeProvider } from "@qeetrix/ui/providers/theme-provider";
import { type RenderOptions, render as rtlRender } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

// The providers the root layout wraps every page in, so a component renders in a test as it
// does in the app (the page's theme toggle needs the theme provider).
function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="qeetid-test-theme">
      {children}
    </ThemeProvider>
  );
}

/** Testing Library's render, inside the app's providers. */
export function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: Providers, ...options });
}
