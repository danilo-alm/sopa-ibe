import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

export function Dialog({ open, onOpenChange, title, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-fade" />
        <DialogPrimitive.Content className="fixed inset-x-3 top-1/2 z-50 max-h-[92vh] -translate-y-1/2 overflow-auto rounded-2xl bg-white p-4 shadow-2xl sm:left-1/2 sm:right-auto sm:w-[min(92vw,760px)] sm:-translate-x-1/2 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <DialogPrimitive.Title className="text-lg font-black text-ibe-black">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200" aria-label="Fechar">
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

