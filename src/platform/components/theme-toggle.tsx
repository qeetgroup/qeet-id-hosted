"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@qeetrix/icons";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTheme,
} from "@qeetrix/ui";
import { useTranslation } from "react-i18next";

const OPTIONS = [
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
  { value: "system", icon: MonitorIcon },
] as const;

/** Light, dark or the system's choice; remembered in this browser by the theme provider. */
export function ThemeToggle() {
  const { t } = useTranslation("common");
  const { theme, setTheme } = useTheme();
  const label = { light: t("theme.light"), dark: t("theme.dark"), system: t("theme.system") };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("theme.toggle")} className="size-9">
            <SunIcon className="size-[1.1rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <MoonIcon className="absolute size-[1.1rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={4} className="min-w-36">
        {OPTIONS.map(({ value, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            <Icon aria-hidden />
            {label[value]}
            {theme === value && (
              <span aria-hidden className="text-muted-foreground ms-auto text-xs">
                ✓
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
