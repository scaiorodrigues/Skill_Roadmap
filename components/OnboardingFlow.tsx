"use client";

import { useState } from "react";
import { ConsentCard } from "@/components/ConsentCard";
import { LinkedInUpload } from "@/components/LinkedInUpload";

export function OnboardingFlow({ consented, imported }: { consented: boolean; imported: boolean }) {
  const [ok, setOk] = useState(consented);
  return ok ? <LinkedInUpload alreadyImported={imported} /> : <ConsentCard onAccepted={() => setOk(true)} />;
}
