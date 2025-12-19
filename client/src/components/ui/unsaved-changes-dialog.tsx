import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAsCopy: () => void;
  onOverwrite: () => void;
  onDontSave: () => void;
  hasExistingEntry: boolean;
}

export function UnsavedChangesDialog({
  isOpen,
  onClose,
  onSaveAsCopy,
  onOverwrite,
  onDontSave,
  hasExistingEntry,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#121212] border-[#2a2a2a] text-[#F7F7F7] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#F7F7F7]">Save chart before leaving?</DialogTitle>
          <DialogDescription className="text-[#9ca3af]">
            You have unsaved changes. What would you like to do?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onDontSave}
            className="border-[#2a2a2a] text-[#9ca3af] hover:text-[#F7F7F7] hover:bg-[#2a2a2a]"
            data-testid="button-dont-save"
          >
            Don't save
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
