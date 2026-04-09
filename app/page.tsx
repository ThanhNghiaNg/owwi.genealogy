import { AuthModal } from "@/components/auth/auth-modal";
import { FamilyTreeApp } from "@/components/family-tree/family-tree-app";
import "./family-tree.css";

export default function Page() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <AuthModal />
      </div>
      <FamilyTreeApp />
    </div>
  );
}
