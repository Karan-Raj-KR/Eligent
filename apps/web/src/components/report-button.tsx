"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiSend } from "@/lib/api";
import { REPORT_TYPES } from "@/lib/types";

/**
 * Students find the mistakes in this data before we do — a deadline that moved,
 * a document the portal demanded that was never listed. POSTs /api/report.
 */
export function ReportButton({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!type) {
      setError("Pick what's wrong first.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await apiSend("/api/report", "POST", {
        opportunity_id: opportunityId,
        report_type: type,
        note: note.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      setOpen(false);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return <p className="text-xs text-muted-foreground">Thanks — reported.</p>;
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground underline" onClick={() => setOpen(true)}>
        Something wrong with this?
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-2">
        <Label htmlFor={`report-${opportunityId}`} className="text-xs">
          What&rsquo;s wrong?
        </Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id={`report-${opportunityId}`}>
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a detail (optional)" />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={sending}>
          {sending ? "Sending…" : "Send report"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
