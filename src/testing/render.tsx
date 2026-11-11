import { type RenderOptions, render as rtlRender } from "@testing-library/react";
import type { ReactElement } from "react";

import { Providers } from "@/platform/components/providers";

/** Testing Library's render, inside the providers the root layout gives every page. */
export function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: Providers, ...options });
}
