"use client";

import {
  Button,
  Link,
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  Text,
  VisuallyHidden,
} from "@qeetrix/react";
import { ThemeSwitcher } from "@qeetrix/react/experimental";
import { useTranslation } from "react-i18next";

import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { PRIVACY_URL, SECURITY_URL, TERMS_URL } from "@/platform/config/site-urls";
import { ChevronDownIcon } from "@/platform/icons";

import { QeetIdLogo } from "./qeet-id-logo";

function isSupported(lng: string | undefined): lng is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lng ?? "");
}

/**
 * The footer every page shares: language and theme on the start side, the website's legal pages
 * on the end side. On a phone it closes the page, ruled off, with the two rows stacked; from a
 * tablet up it sits under the card in one row. A branded page says who runs the sign-in.
 */
export function PageFooter({ branded = false }: { branded?: boolean }) {
  const { t } = useTranslation("common");
  return (
    <footer className="flex flex-col gap-x-6 gap-y-3 border-t border-border-subtle px-5 pt-4 pb-6 tablet:mt-4 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:justify-between tablet:gap-y-2 tablet:border-0 tablet:p-0">
      <div className="-ms-2 flex items-center gap-1">
        <LanguageMenu />
        <ThemeSwitcher size="sm" menuSide="top" />
        {branded && (
          <Text size="sm" tone="subtle" className="ms-2 inline-flex items-center gap-1.5">
            {t("signInBy")} <QeetIdLogo size={16} />
          </Text>
        )}
      </div>
      <nav aria-label={t("legal.label")} className="flex flex-wrap gap-x-5 gap-y-1">
        {(
          [
            [TERMS_URL, t("legal.terms")],
            [PRIVACY_URL, t("legal.privacy")],
            [SECURITY_URL, t("legal.security")],
          ] as const
        ).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            tone="subtle"
            external
            className="typography-body-sm"
            messages={{ external: t("newTab") }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

/** Every language the pages ship, as a menu; the choice is kept in this browser. */
function LanguageMenu() {
  const { t, i18n } = useTranslation("common");
  const current = isSupported(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";
  return (
    <Menu>
      <MenuTrigger
        render={<Button variant="ghost" tone="neutral" size="sm" icon={ChevronDownIcon} />}
      >
        <VisuallyHidden>{t("language")}:</VisuallyHidden> {LANGUAGE_LABELS[current]}
      </MenuTrigger>
      <MenuContent side="top" align="start">
        <MenuRadioGroup
          value={current}
          onValueChange={(value: unknown) => {
            if (typeof value === "string" && isSupported(value)) void i18n.changeLanguage(value);
          }}
        >
          {SUPPORTED_LANGUAGES.map((lng) => (
            <MenuRadioItem key={lng} value={lng}>
              {LANGUAGE_LABELS[lng]}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
