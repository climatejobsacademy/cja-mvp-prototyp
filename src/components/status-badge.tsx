import {
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Clock,
  type LucideIcon,
  ThumbsDown,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<
  Parameters<typeof badgeVariants>[0]
>["variant"];

/**
 * Status nie nur über Farbe zeigen (WCAG 1.4.1, docs/design-specifications.md
 * Abschnitt 1) — jede StatusBadge trägt deshalb immer Icon + Text zusammen.
 */
// Flächen laut Handoff: Abgeschlossen bg-eco-green/10, Ausstehend/In Prüfung
// bg-lylac/30, Offen nur Rand. Warnung (Abgelehnt) bleibt beim Token-Wert.
const HANDOFF_FLAECHE: Partial<Record<NonNullable<BadgeVariant>, string>> = {
  success: "bg-eco-green/10 border-transparent",
  info: "bg-lylac/30 border-transparent",
};

export function StatusBadge({
  label,
  icon: Icon,
  variant,
  className,
}: {
  label: string;
  icon: LucideIcon;
  variant: BadgeVariant;
  className?: string;
}) {
  return (
    <Badge
      variant={variant}
      className={cn(
        // Handoff 2a: px-2.5 py-1 text-[13px] rounded-full, Icon 14 px.
        "h-auto gap-1 rounded-full px-2.5 py-1 text-[13px] font-medium [&>svg]:size-3.5!",
        HANDOFF_FLAECHE[variant ?? "default"],
        className
      )}
    >
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

/** Verifizierungsstatus einer field_capture — pending existiert nicht als
 * eigener DB-Wert, siehe docs/open-questions.md (Q-CAPTURE-PENDING-UI):
 * status="submitted" ohne verification-Zeile heißt in der UI "pending". */
export type CaptureUiStatus = "pending" | "verified" | "rejected";

const CAPTURE_STATUS: Record<
  CaptureUiStatus,
  { label: string; icon: LucideIcon; variant: BadgeVariant }
> = {
  pending: { label: "Wird verifiziert", icon: Clock, variant: "info" },
  verified: { label: "Verifiziert", icon: CheckCircle2, variant: "success" },
  rejected: { label: "Abgelehnt", icon: ThumbsDown, variant: "warning" },
};

export function CaptureStatusBadge({ status }: { status: CaptureUiStatus }) {
  const { label, icon, variant } = CAPTURE_STATUS[status];
  return <StatusBadge label={label} icon={icon} variant={variant} />;
}

const UNIT_PROGRESS_STATUS: Record<
  "offen" | "in Bearbeitung" | "abgeschlossen",
  { label: string; icon: LucideIcon; variant: BadgeVariant }
> = {
  offen: { label: "Offen", icon: CircleDashed, variant: "outline" },
  "in Bearbeitung": { label: "In Bearbeitung", icon: Clock, variant: "info" },
  abgeschlossen: {
    label: "Abgeschlossen",
    icon: CheckCircle2,
    variant: "success",
  },
};

export function UnitProgressBadge({
  status,
}: {
  status: keyof typeof UNIT_PROGRESS_STATUS;
}) {
  const { label, icon, variant } = UNIT_PROGRESS_STATUS[status];
  return <StatusBadge label={label} icon={icon} variant={variant} />;
}

/** Teilschritt-Status im Kompetenz-Dashboard (design-specifications.md 2.3). */
const STEP_STATUS: Record<
  "abgeschlossen" | "in Prüfung" | "abgelehnt" | "offen",
  { label: string; icon: LucideIcon; variant: BadgeVariant }
> = {
  offen: { label: "Offen", icon: CircleDashed, variant: "outline" },
  "in Prüfung": { label: "In Prüfung", icon: Clock, variant: "info" },
  abgeschlossen: { label: "Abgeschlossen", icon: CheckCircle2, variant: "success" },
  abgelehnt: { label: "Abgelehnt", icon: ThumbsDown, variant: "warning" },
};

export function StepStatusBadge({ status }: { status: keyof typeof STEP_STATUS }) {
  const { label, icon, variant } = STEP_STATUS[status];
  return <StatusBadge label={label} icon={icon} variant={variant} />;
}

/** Theoretisch/praktisch — nie nur über Farbe, siehe StatusBadge oben. */
export function StepTypBadge({
  typ,
  className,
}: {
  typ: "theoretisch" | "praktisch";
  className?: string;
}) {
  return typ === "praktisch" ? (
    <StatusBadge label="Praxis" icon={Wrench} variant="outline" className={className} />
  ) : (
    <StatusBadge label="Theorie" icon={BookOpen} variant="outline" className={className} />
  );
}
