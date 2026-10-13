import { Check, X, Info } from "lucide-react";
import type { Verification } from "../../../packages/verifier/index.ts";
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"pill " + tone}>{children}</span>;
}
export function CheckRow({
  label,
  check,
}: {
  label: string;
  check: Verification["integrity"];
}) {
  return (
    <div className={"verification-check " + check.status.toLowerCase()}>
      <span className="check-icon">
        {check.status === "MATCH" ? (
          <Check size={19} />
        ) : check.status === "MISMATCH" ? (
          <X size={19} />
        ) : (
          <Info size={19} />
        )}
      </span>
      <div>
        <h3>
          {label}
          <Pill
            tone={
              check.status === "MATCH"
                ? "teal"
                : check.status === "MISMATCH"
                  ? "red"
                  : "amber"
            }
          >
            {check.status.replaceAll("_", " ")}
          </Pill>
        </h3>
        <p>{check.detail}</p>
      </div>
    </div>
  );
}
