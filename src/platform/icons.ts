// Every icon the hosted pages draw: Qeetrix icons (@qeetrix/icons 2) in the sharp shape, as the
// Qeetrix design rules ask. Code imports icons from here, never from @qeetrix/icons directly
// (Biome enforces it), so one page never mixes shapes. Icons that point a reading direction
// (arrows, chevrons) turn round in a right-to-left language.
//
// Add an icon here, in alphabetical order, before using it, after looking at its drawing: a name
// doesn't always say what an icon shows.

import {
  type IconProps,
  ArrowLeftIcon as QArrowLeftIcon,
  ArrowRightIcon as QArrowRightIcon,
  BuildingIcon as QBuildingIcon,
  CheckIcon as QCheckIcon,
  ChevronDownIcon as QChevronDownIcon,
  ChevronRightIcon as QChevronRightIcon,
  CircleAlertIcon as QCircleAlertIcon,
  CircleCheckIcon as QCircleCheckIcon,
  CircleDashedIcon as QCircleDashedIcon,
  ClockIcon as QClockIcon,
  ExternalLinkIcon as QExternalLinkIcon,
  GlobeLockIcon as QGlobeLockIcon,
  InfoIcon as QInfoIcon,
  KeyRoundIcon as QKeyRoundIcon,
  LockKeyholeIcon as QLockKeyholeIcon,
  LogInIcon as QLogInIcon,
  MailIcon as QMailIcon,
  MessageSquareTextIcon as QMessageSquareTextIcon,
  MonitorSmartphoneIcon as QMonitorSmartphoneIcon,
  NetworkIcon as QNetworkIcon,
  PencilIcon as QPencilIcon,
  PlusIcon as QPlusIcon,
  QrCodeIcon as QQrCodeIcon,
  RefreshCwIcon as QRefreshCwIcon,
  RotateCwIcon as QRotateCwIcon,
  ShieldCheckIcon as QShieldCheckIcon,
  SmartphoneIcon as QSmartphoneIcon,
  TrashIcon as QTrashIcon,
  TriangleAlertIcon as QTriangleAlertIcon,
  TvMinimalIcon as QTvMinimalIcon,
  UserRoundIcon as QUserRoundIcon,
  ZapIcon as QZapIcon,
} from "@qeetrix/icons";
import { mirrorInRtl } from "@qeetrix/react/provider";
import { createElement, type JSX } from "react";

export type { IconProps };

export type Icon = (props: IconProps) => JSX.Element;

function sharp<P extends IconProps>(Base: (props: P) => JSX.Element): Icon {
  const Sharp = (props: IconProps) => createElement(Base, { shape: "sharp", ...props } as P);
  Sharp.displayName = Base.name;
  return Sharp;
}

/** A sharp icon that points the reading direction, so it turns round in right-to-left. */
function forward<P extends IconProps>(Base: (props: P) => JSX.Element): Icon {
  return mirrorInRtl(sharp(Base)) as Icon;
}

export const ArrowLeftIcon = forward(QArrowLeftIcon);
export const ArrowRightIcon = forward(QArrowRightIcon);
export const BuildingIcon = sharp(QBuildingIcon);
export const CheckIcon = sharp(QCheckIcon);
export const ChevronDownIcon = sharp(QChevronDownIcon);
export const ChevronRightIcon = forward(QChevronRightIcon);
export const CircleAlertIcon = sharp(QCircleAlertIcon);
export const CircleCheckIcon = sharp(QCircleCheckIcon);
export const CircleDashedIcon = sharp(QCircleDashedIcon);
export const ClockIcon = sharp(QClockIcon);
export const ExternalLinkIcon = sharp(QExternalLinkIcon);
export const GlobeLockIcon = sharp(QGlobeLockIcon);
export const InfoIcon = sharp(QInfoIcon);
export const KeyRoundIcon = sharp(QKeyRoundIcon);
export const LockKeyholeIcon = sharp(QLockKeyholeIcon);
export const LogInIcon = sharp(QLogInIcon);
export const MailIcon = sharp(QMailIcon);
export const MessageSquareTextIcon = sharp(QMessageSquareTextIcon);
export const MonitorSmartphoneIcon = sharp(QMonitorSmartphoneIcon);
export const NetworkIcon = sharp(QNetworkIcon);
export const PencilIcon = sharp(QPencilIcon);
export const PlusIcon = sharp(QPlusIcon);
export const QrCodeIcon = sharp(QQrCodeIcon);
export const RefreshCwIcon = sharp(QRefreshCwIcon);
export const RotateCwIcon = sharp(QRotateCwIcon);
export const ShieldCheckIcon = sharp(QShieldCheckIcon);
export const SmartphoneIcon = sharp(QSmartphoneIcon);
export const TrashIcon = sharp(QTrashIcon);
export const TriangleAlertIcon = sharp(QTriangleAlertIcon);
export const TvMinimalIcon = sharp(QTvMinimalIcon);
export const UserRoundIcon = sharp(QUserRoundIcon);
export const ZapIcon = sharp(QZapIcon);
