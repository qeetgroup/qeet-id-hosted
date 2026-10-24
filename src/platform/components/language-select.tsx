"use client";

import { GlobeIcon } from "@qeetrix/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@qeetrix/ui";
import { useTranslation } from "react-i18next";

import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

function isSupported(lng: string | undefined): lng is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lng ?? "");
}

/** The language picker in the page's top corner, listing every language the UI ships. */
export function LanguageSelect() {
  const { t, i18n } = useTranslation("common");
  const current = isSupported(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";
  return (
    <Select
      value={current}
      onValueChange={(value) => {
        if (isSupported(value as string)) void i18n.changeLanguage(value as string);
      }}
    >
      <SelectTrigger
        aria-label={t("language")}
        className="auth-language h-9 w-auto gap-2 border-transparent bg-transparent px-2 text-sm shadow-none"
      >
        <GlobeIcon aria-hidden className="text-muted-foreground size-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <SelectItem key={lng} value={lng}>
            {LANGUAGE_LABELS[lng]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
