import { Suspense } from "react";
import type { Metadata } from "next";
import { Analyzer } from "@/components/analyzer/Analyzer";

export const metadata: Metadata = { title: "Analizar mi cartera · Invertify" };

export default function Page() {
  return (
    <Suspense>
      <Analyzer />
    </Suspense>
  );
}
