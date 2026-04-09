import Link from "next/link";

import { FamilyTreeApp } from "@/components/family-tree/family-tree-app";
import { Button } from "@/components/ui/button";
import "./family-tree.css";

export default function Page() {
  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-20">
        <Button asChild variant="outline">
          <Link href="/auth">Auth</Link>
        </Button>
      </div>
      <FamilyTreeApp />
    </div>
  );
}
