import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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

  const navigate = useNavigate();

  return (
    <div
      className="relative opacity-50 cursor-not-allowed w-full h-full"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toast.info(fallbackMessage, {
          action: {
            label: "Upgrade",
            onClick: () => navigate("/subscription"),
          },
        });
      }}
    >
      <div className="pointer-events-none w-full h-full [&>*]:w-full [&>*]:h-full">
        {children}
      </div>
    </div>
  );
};

export default ProGate;
