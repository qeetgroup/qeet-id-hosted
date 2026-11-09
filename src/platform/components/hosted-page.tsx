"use client";

import { Heading, Text } from "@qeetrix/react";
import type { ReactNode } from "react";

import {
  BRANDED_CLASS,
  type Branding,
  brandingVars,
  hasBrandColor,
} from "@/platform/branding/branding";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  type Icon,
  InfoIcon,
  TriangleAlertIcon,
} from "@/platform/icons";

import { BrandLogo } from "./brand-logo";
import { PageFooter } from "./page-footer";

export type PageStatus = "success" | "danger" | "warning" | "info";

export type HostedPageProps = {
  title: ReactNode;
  /** One or two sentences under the title. */
  description?: ReactNode;
  /** Under the description: the application being signed in to, or the account in use. */
  lead?: ReactNode;
  /** A result page's status: an icon above the title in the status colour, never alone. */
  status?: PageStatus;
  /** The organisation's branding, from the login context: its logo and colour. */
  branding?: Branding;
  /**
   * "card": a step of a flow, in the card. "page": a page of its own (passkeys, enterprise setup),
   * with a top bar and a wider column.
   */
  kind?: "card" | "page";
  /**
   * Card kind: one column on a laptop too, for a page that reports something and offers a button
   * or two (sent, added, signed out, expired), so the buttons sit under the words.
   */
  single?: boolean;
  /** Page kind: the column's width. */
  width?: "md" | "lg";
  /** Page kind: the end of the top bar, such as whose setup this is. */
  barEnd?: ReactNode;
  children?: ReactNode;
};

const STATUS: Record<PageStatus, { icon: Icon; className: string }> = {
  success: { icon: CircleCheckIcon, className: "text-icon-success" },
  danger: { icon: CircleAlertIcon, className: "text-icon-danger" },
  warning: { icon: TriangleAlertIcon, className: "text-icon-warning" },
  info: { icon: InfoIcon, className: "text-icon-info" },
};

/**
 * Every page's frame, in the mockups' three layouts. On a phone (under 600 px) the page is the
 * form, edge to edge. On a tablet it is a card in the middle. On a laptop or wider a form sits
 * beside its heading in a wide card, so a wide screen doesn't stretch a 400 px form; a page that
 * only reports something stays one column. Under it, the footer. Welcoming pages are comfortable
 * density (Qeetrix's rules), and an organisation's colour replaces Qeet orange throughout.
 */
export function HostedPage(props: HostedPageProps) {
  const { branding, kind = "card" } = props;
  const branded = hasBrandColor(branding);
  return (
    <div
      data-qx-density="comfortable"
      style={brandingVars(branding)}
      className={`min-h-dvh bg-surface-raised tablet:bg-surface-canvas ${branded ? BRANDED_CLASS : ""}`}
    >
      {kind === "page" ? <PageLayout {...props} /> : <CardLayout {...props} />}
    </div>
  );
}

function Header({ title, description, lead, status, kind = "card" }: HostedPageProps) {
  const s = status ? STATUS[status] : undefined;
  return (
    <div>
      {s && <s.icon size={24} className={`mb-4 ${s.className}`} />}
      <Heading
        level={1}
        className={
          kind === "page"
            ? "typography-heading-sm tablet:typography-heading-md"
            : "typography-heading-md tablet:typography-heading-lg laptop:typography-display-sm"
        }
      >
        {title}
      </Heading>
      {description && (
        <Text
          size="md"
          tone="subtle"
          className="mt-2 tablet:mt-3 tablet:typography-body-lg"
          render={<p />}
        >
          {description}
        </Text>
      )}
      {lead && <div className="mt-5 tablet:mt-6">{lead}</div>}
    </div>
  );
}

function CardLayout(props: HostedPageProps) {
  const { branding, children, single } = props;
  // Two columns on a laptop only for a form beside its heading.
  const split = Boolean(children) && !single;
  return (
    <div className="flex min-h-dvh flex-col tablet:items-center tablet:justify-center tablet:px-8 tablet:py-12 laptop:px-12 laptop:py-14">
      <div
        className={`flex w-full flex-1 flex-col tablet:max-w-[480px] tablet:flex-none ${
          split ? "laptop:max-w-[1040px]" : "laptop:max-w-[560px]"
        }`}
      >
        <main className="hosted-enter flex-1 px-5 pt-6 pb-10 tablet:rounded-surface tablet:border tablet:border-border-default tablet:bg-surface-raised tablet:p-10 laptop:p-12">
          <BrandLogo branding={branding} />
          <div
            className={`mt-8 tablet:mt-9 ${
              split
                ? "laptop:mt-12 laptop:grid laptop:grid-cols-[minmax(0,1fr)_400px] laptop:gap-x-16"
                : ""
            }`}
          >
            <Header {...props} />
            {children && (
              <div className={`mt-7 tablet:mt-8 ${split ? "laptop:mt-0" : ""}`}>{children}</div>
            )}
          </div>
        </main>
        <PageFooter branded={Boolean(branding)} />
      </div>
    </div>
  );
}

function PageLayout(props: HostedPageProps) {
  const { branding, width = "md", barEnd, children } = props;
  const column = width === "lg" ? "max-w-[1040px]" : "max-w-[720px]";
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border-default bg-surface-raised px-5 tablet:px-8">
        <BrandLogo branding={branding} />
        {barEnd}
      </header>
      <main
        className={`hosted-enter mx-auto w-full flex-1 px-5 pt-7 pb-10 tablet:px-8 tablet:pt-10 tablet:pb-12 laptop:px-12 laptop:pt-12 laptop:pb-14 ${column}`}
      >
        <Header {...props} />
        {children && <div className="mt-7 tablet:mt-9">{children}</div>}
      </main>
      <div className={`mx-auto w-full tablet:px-8 tablet:pb-6 laptop:px-12 laptop:pb-8 ${column}`}>
        <PageFooter branded={Boolean(branding)} />
      </div>
    </div>
  );
}
