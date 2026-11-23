import { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BasicModalProps {
  children?: React.ReactNode;
  header?: string | React.ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  primaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionDisabled?: boolean;
  /** Use "destructive" when confirming removes or cancels something. */
  primaryActionVariant?: "default" | "destructive";
  /** Dismiss-button label; override when "Cancel" would be ambiguous. */
  cancelLabel?: string;
  placement?: "auto" | "top" | "center" | "bottom";
  hideButtons?: boolean;
}

const BasicModal: FC<BasicModalProps> = ({
  children,
  header,
  isOpen,
  onOpenChange,
  primaryAction,
  primaryActionLabel,
  primaryActionDisabled = false,
  primaryActionVariant = "default",
  cancelLabel = "Cancel",
  hideButtons = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="pb-8">
        {header && (
          <DialogHeader>
            <DialogTitle>{header}</DialogTitle>
          </DialogHeader>
        )}
        <div>{children}</div>
        {
          // If hideButtons is false, render the buttons
          !hideButtons && (
            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
              {primaryAction && (
                <Button
                  variant={primaryActionVariant}
                  onClick={primaryAction}
                  disabled={primaryActionDisabled}
                >
                  {primaryActionLabel}
                </Button>
              )}
            </DialogFooter>
          )
        }
      </DialogContent>
    </Dialog>
  );
};

export default BasicModal;
