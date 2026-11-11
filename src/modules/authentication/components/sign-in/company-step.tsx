"use client";

import { Button, Field, TextField } from "@qeetrix/react";
import { PasswordInput } from "@qeetrix/react/experimental";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type Company,
  type Connection,
  shortName,
  startUrl,
} from "@/modules/authentication/company-sign-in";
import type { SessionResponse } from "@/modules/authentication/session";
import { ApiError, apiPost } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { ChoiceList, FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowLeftIcon, ArrowRightIcon, BuildingIcon, NetworkIcon } from "@/platform/icons";
import { goTo } from "@/platform/navigation/go-to";

import { type Problem, problemOf } from "../../sign-in-problems";
import { ProblemAlert } from "./problem-alert";

export type CompanyStepProps = {
  email: string;
  company: Company;
  /** Where the browser goes once signed in: the application's authorize request. */
  returnTo: string;
  /**
   * Qeet ID's own ways (the password or the link), when the application allows them. The server
   * still refuses them for an address that must use its company's sign-in; its break-glass
   * members keep them, so the way is offered whenever the application has one.
   */
  onOther?: () => void;
  onChangeEmail: () => void;
  /** A directory's answer: signed in, or a second step to meet first. */
  onSession: (res: SessionResponse) => void;
  branding?: Branding;
};

/**
 * The organisation that manages the address's domain signs its people in itself: through its
 * identity provider (SAML or OpenID Connect), which the browser goes to and comes back from, or
 * its directory (LDAP), whose user name and password are asked for here. One connection is named;
 * several are listed to choose from.
 */
export function CompanyStep(props: CompanyStepProps) {
  const { email, company, branding } = props;
  const { t } = useTranslation("signIn");
  const only = company.connections.length === 1 ? company.connections[0] : null;
  const [chosen, setChosen] = useState<Connection | null>(only);
  const [opening, setOpening] = useState<string | null>(null);
  const org = company.organization;
  const idpOf = (c: Connection) => shortName(c.name, org);
  const chip = (
    <AccountChip email={email} action={t("password.change")} onAction={props.onChangeEmail} />
  );

  function open(c: Connection) {
    setOpening(c.id);
    goTo(startUrl(c, props.returnTo));
  }

  function choose(c: Connection) {
    if (c.method === "credentials") setChosen(c);
    else open(c);
  }

  const other = props.onOther && (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      fullWidth
      disabled={opening !== null}
      onClick={props.onOther}
    >
      {t("company.other")}
    </Button>
  );

  if (chosen?.method === "credentials") {
    return (
      <DirectoryForm
        email={email}
        connection={chosen}
        org={org}
        branding={branding}
        onSession={props.onSession}
        onBack={only ? props.onChangeEmail : () => setChosen(null)}
      />
    );
  }

  if (chosen) {
    const idp = idpOf(chosen);
    return (
      <HostedPage
        single
        branding={branding}
        title={org ? t("company.title", { org }) : t("company.titleNoOrg")}
        description={org ? t("company.body", { org, idp }) : t("company.bodyNoOrg", { idp })}
        lead={chip}
      >
        <FormStack>
          <Button
            type="button"
            size="lg"
            fullWidth
            icon={NetworkIcon}
            loading={opening === chosen.id}
            onClick={() => open(chosen)}
          >
            {opening === chosen.id ? t("company.opening", { idp }) : t("company.continue", { idp })}
          </Button>
          {other}
        </FormStack>
      </HostedPage>
    );
  }

  return (
    <HostedPage
      branding={branding}
      title={org ? t("company.title", { org }) : t("company.titleNoOrg")}
      description={org ? t("company.chooseBody", { org }) : t("company.chooseBodyNoOrg")}
      lead={chip}
    >
      <FormStack>
        <ChoiceList
          label={t("company.chooseLabel")}
          items={company.connections.map((c) => ({
            id: c.id,
            icon: BuildingIcon,
            title: idpOf(c),
            detail: `${c.name} · ${t(`company.protocols.${c.protocol}`)}`,
            disabled: opening !== null,
            onClick: () => choose(c),
          }))}
        />
        {other}
      </FormStack>
    </HostedPage>
  );
}

/** A directory's sign-in: its user name (at first the address's local part) and password. */
function DirectoryForm({
  email,
  connection,
  org,
  branding,
  onSession,
  onBack,
}: {
  email: string;
  connection: Connection;
  org?: string;
  branding?: Branding;
  onSession: (res: SessionResponse) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("signIn");
  const [username, setUsername] = useState(email.split("@")[0] ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWrong(false);
    setProblem(null);
    setBusy(true);
    try {
      const res = await apiPost<SessionResponse>(connection.session_path ?? "", {
        username: username.trim(),
        password,
      });
      onSession(res);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ldap.invalid_credentials") setWrong(true);
      else setProblem(problemOf(err));
      setBusy(false);
    }
  }

  return (
    <HostedPage
      branding={branding}
      title={org ? t("company.dirTitle", { org }) : t("company.dirTitleNoOrg")}
      description={org ? t("company.dirBody", { org }) : t("company.dirBodyNoOrg")}
    >
      <form onSubmit={submit}>
        <FormStack>
          <ProblemAlert problem={problem} org={org} />
          <TextField
            label={t("company.user")}
            name="username"
            required
            autoFocus
            placeholder={t("company.userHint")}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
          />
          <Field
            label={t("company.password")}
            invalid={wrong}
            error={wrong ? t("company.wrong") : undefined}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
            )}
          </Field>
          <Button type="submit" size="lg" fullWidth icon={ArrowRightIcon} loading={busy}>
            {t("company.signIn")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            icon={ArrowLeftIcon}
            disabled={busy}
            onClick={onBack}
          >
            {t("company.other")}
          </Button>
        </FormStack>
      </form>
    </HostedPage>
  );
}
