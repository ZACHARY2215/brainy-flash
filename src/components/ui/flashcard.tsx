import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const flashcardVariants = cva(
  "relative w-full transform-style-preserve-3d cursor-pointer select-none",
  {
    variants: {
      size: {
        default: "h-48 md:h-56",
        compact: "h-32 md:h-40",
        large: "h-64 md:h-80",
      },
      state: {
        default: "transition-all duration-300",
        flipped: "rotate-x-180",
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
        back: "bg-gradient-primary text-primary-foreground border-primary",
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
    const [shouldAnimate, setShouldAnimate] = React.useState(false);
    const [internalFlipped, setInternalFlipped] = React.useState(isFlipped);

    // Handle external prop changes (reset without animation)
    React.useEffect(() => {
      if (isFlipped !== internalFlipped) {
        setInternalFlipped(isFlipped);
        setShouldAnimate(false); // disables animation on reset
      }
    }, [isFlipped, internalFlipped]);

    const handleClick = () => {
      setShouldAnimate(true);
      const newFlippedState = !internalFlipped;
      setInternalFlipped(newFlippedState);
      onFlip?.();
    };

    return (
      <div
        ref={ref}
        className={cn(
          flashcardVariants({ size, state }),
          internalFlipped && "rotate-x-180",
          shouldAnimate && "transition-transform duration-500 ease-in-out",
          className
        )}
        onClick={handleClick}
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
        <div 
          className={cn(flashcardFaceVariants({ side: "back" }))} 
          style={{ transform: "rotateX(180deg)" }}
        >
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
