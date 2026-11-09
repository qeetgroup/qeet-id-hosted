"use client";

import { Button, Radio, RadioGroup, Spinner, Text } from "@qeetrix/react";
import { CopyField, InstructionList, InstructionStep } from "@qeetrix/react/experimental";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  createSamlConnection,
  type SamlConnection,
  updateSamlConnection,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";
import { ArrowRightIcon } from "@/platform/icons";

import { IDP_KINDS, type IdpKind } from "../identity-providers";

/**
 * Connect the identity provider: which one (Okta, Microsoft Entra ID, Google Workspace or another),
 * then that provider's own steps and field names, with Qeet ID's two values to give it, each with
 * Copy. The connection is saved as a draft first, so its values exist before the provider's
 * details do; the provider's details come next, on their own page.
 */
export function ConnectStep({
  connection,
  idp,
  orgName,
  onIdp,
  onDraft,
  onAddDetails,
}: {
  connection: SamlConnection | null;
  idp: IdpKind;
  orgName: string;
  onIdp: (idp: IdpKind) => void;
  onDraft: (connection: SamlConnection) => void;
  onAddDetails: () => void;
}) {
  const { t } = useTranslation("enterpriseSetup");
  const [error, setError] = useState<string | null>(null);
  const creating = useRef(false);
  const name = (kind: IdpKind) =>
    kind === "other" ? orgName : `${orgName} ${t(`connect.idps.${kind}.name`)}`;

  // The draft whose addresses the provider needs: made once, named after the provider chosen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: made once, when the step opens
  useEffect(() => {
    if (connection || creating.current) return;
    creating.current = true;
    createSamlConnection({ name: name(idp) })
      .then(onDraft)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("setup.loadFailed")));
  }, [connection]);

  async function choose(kind: IdpKind) {
    onIdp(kind);
    if (connection && !connection.idp_entity_id) {
      try {
        onDraft(await updateSamlConnection(connection.id, { name: name(kind) }));
      } catch {
        // The name is only a label; the setup goes on with the old one.
      }
    }
  }

  const words = (key: string) => t(`connect.idps.${idp}.${key}`);
  const idpName = t(`connect.idps.${idp}.name`);
  return (
    <>
      <FormAlert title={error} />
      <RadioGroup<IdpKind>
        label={t("connect.which")}
        variant="tile"
        columns={2}
        value={idp}
        onValueChange={(value) => void choose(value)}
      >
        {IDP_KINDS.map((kind) => (
          <Radio<IdpKind>
            key={kind}
            value={kind}
            label={kind === "other" ? t("connect.other") : t(`connect.idps.${kind}.name`)}
          />
        ))}
      </RadioGroup>
      <InstructionList>
        <InstructionStep title={words("how")}>{words("howBody")}</InstructionStep>
        <InstructionStep title={t("connect.give", { idp: idpName })}>
          {connection?.acs_url && connection.sp_entity_id ? (
            <div className="mt-3 flex flex-col gap-3">
              <CopyField label={words("acs")} value={connection.acs_url} wrap="anywhere" />
              <CopyField
                label={words("audience")}
                value={connection.sp_entity_id}
                wrap="anywhere"
              />
            </div>
          ) : (
            <div role="status" className="mt-3 flex items-center gap-3">
              <Spinner size="sm" tone="brand" decorative />
              <Text size="md" tone="subtle">
                {t("connect.preparing")}
              </Text>
            </div>
          )}
        </InstructionStep>
        <InstructionStep title={words("send")}>{words("sendBody")}</InstructionStep>
      </InstructionList>
      <Button
        type="button"
        icon={ArrowRightIcon}
        className="self-start"
        disabled={!connection}
        onClick={onAddDetails}
      >
        {t("connect.addDetails", { idp: idpName })}
      </Button>
    </>
  );
}
