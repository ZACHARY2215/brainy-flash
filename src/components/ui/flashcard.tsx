import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const flashcardVariants = cva(
  "relative w-full transition-all duration-500 transform-style-preserve-3d cursor-pointer select-none",
  {
    variants: {
      size: {
        default: "h-48 md:h-56",
        compact: "h-32 md:h-40",
        large: "h-64 md:h-80",
      },
      state: {
        default: "hover:shadow-floating hover:-translate-y-1",
        flipped: "rotate-y-180",
        correct: "ring-2 ring-success shadow-glow",
        incorrect: "ring-2 ring-destructive shadow-glow",
      },
    },
    defaultVariants: {
      size: "default",
      state: "default",
    },
  }
)

const flashcardFaceVariants = cva(
  "absolute inset-0 w-full h-full backface-hidden rounded-lg border p-6 flex flex-col items-center justify-center text-center transition-all duration-300",
  {
    variants: {
      side: {
        front: "bg-gradient-card border-border shadow-card",
        back: "bg-gradient-primary text-primary-foreground border-primary rotate-y-180",
      },
    },
    defaultVariants: {
      side: "front",
    },
  }
)

export interface FlashcardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flashcardVariants> {
  front: React.ReactNode
  back: React.ReactNode
  isFlipped?: boolean
  onFlip?: () => void
}

const Flashcard = React.forwardRef<HTMLDivElement, FlashcardProps>(
  ({ className, size, state, front, back, isFlipped = false, onFlip, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          flashcardVariants({ size, state: isFlipped ? "flipped" : state }),
          className
        )}
        onClick={onFlip}
        style={{ transformStyle: "preserve-3d" }}
        {...props}
      >
        {/* Front face */}
        <div className={cn(flashcardFaceVariants({ side: "front" }))}>
          <div className="flex-1 flex items-center justify-center">
            {typeof front === "string" ? (
              <h3 className="text-lg md:text-xl font-semibold text-foreground">
                {front}
              </h3>
            ) : (
              front
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Click to flip
          </div>
        </div>

        {/* Back face */}
        <div className={cn(flashcardFaceVariants({ side: "back" }))}>
          <div className="flex-1 flex items-center justify-center">
            {typeof back === "string" ? (
              <p className="text-base md:text-lg text-primary-foreground leading-relaxed">
                {back}
              </p>
            ) : (
              back
            )}
          </div>
          <div className="text-xs text-primary-foreground/70 mt-2">
            Click to flip back
          </div>
        </div>
      </div>
    )
  }
)

Flashcard.displayName = "Flashcard"

export { Flashcard, flashcardVariants }