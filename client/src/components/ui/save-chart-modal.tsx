import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SaveChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverwrite: () => void;
  onSaveAsCopy: () => void;
  hasExistingEntry: boolean;
}

export function SaveChartModal({
  isOpen,
  onClose,
  onOverwrite,
  onSaveAsCopy,
  hasExistingEntry,
}: SaveChartModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#121212] border-[#2a2a2a] text-[#F7F7F7] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#F7F7F7]">Save changes?</DialogTitle>
          <DialogDescription className="text-[#9ca3af]">
            {hasExistingEntry
              ? "Do you want to overwrite the existing saved chart, or save a new copy?"
              : "Save your chart to the history log."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#F7F7F7] hover:bg-[#2a2a2a]"
            data-testid="button-cancel-save"
          >
            Cancel
          </Button>
          {hasExistingEntry ? (
            <>
              <Button
                variant="outline"
                onClick={onSaveAsCopy}
                className="border-[#5AF5FA] text-[#5AF5FA] hover:bg-[#5AF5FA]/10 hover:text-[#5AF5FA]"
                data-testid="button-save-as-copy"
              >
                Save as copy
              </Button>
              <Button
                onClick={onOverwrite}
                className="bg-[#5AF5FA] text-[#121212] hover:bg-[#5AF5FA]/80"
                data-testid="button-overwrite"
              >
                Overwrite
              </Button>
            </>
          ) : (
            <Button
              onClick={onSaveAsCopy}
              className="bg-[#5AF5FA] text-[#121212] hover:bg-[#5AF5FA]/80"
              data-testid="button-save"
            >
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
