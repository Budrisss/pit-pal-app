import { ReactNode } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";

interface ProGateProps {
  children: ReactNode;
  fallbackMessage?: string;
}

/**
 * Wraps a clickable element. If the user is on the free tier,
 * the element is greyed out and clicking shows a toast.
 */
const ProGate = ({ children, fallbackMessage = "This feature is only available for Trackside Pro users" }: ProGateProps) => {
  const { isPro } = useSubscription();

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative opacity-50 cursor-not-allowed w-full h-full"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toast.info(fallbackMessage);
      }}
    >
      <div className="pointer-events-none w-full h-full [&>*]:w-full [&>*]:h-full">
        {children}
      </div>
    </div>
  );
};

export default ProGate;
