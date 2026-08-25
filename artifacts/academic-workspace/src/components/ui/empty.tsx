import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance rounded-lg border-dashed p-6 text-center md:p-12',
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        'flex max-w-sm flex-col items-center gap-2 text-center',
        className,
      )}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
      illustration: {
        default: '',
        papers: 'bg-gradient-to-br from-primary/5 to-primary/10 size-20 rounded-2xl border border-primary/10',
        book: 'bg-gradient-to-br from-primary/5 to-primary/10 size-20 rounded-2xl border border-primary/10',
        attachment: 'bg-gradient-to-br from-primary/5 to-primary/10 size-20 rounded-2xl border border-primary/10',
        chat: 'bg-gradient-to-br from-primary/5 to-primary/10 size-20 rounded-2xl border border-primary/10',
        quiz: 'bg-gradient-to-br from-primary/5 to-primary/10 size-20 rounded-2xl border border-primary/10',
      },
    },
    defaultVariants: {
      variant: 'default',
      illustration: 'default',
    },
  },
);

function EmptyMedia({
  className,
  variant = 'default',
  illustration,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, illustration, className }))}
      {...props}
    >
      {illustration === 'papers' && <EmptyIllustrationPapers />}
      {illustration === 'book' && <EmptyIllustrationBook />}
      {illustration === 'attachment' && <EmptyIllustrationAttachment />}
      {illustration === 'chat' && <EmptyIllustrationChat />}
      {illustration === 'quiz' && <EmptyIllustrationQuiz />}
    </div>
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={cn('text-lg font-medium tracking-tight', className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        'text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm',
        className,
      )}
      {...props}
    />
  );
}

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function EmptyIllustrationPapers() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Stack of 3 papers */}
      <rect x="14" y="20" width="36" height="28" rx="3" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="17" y="17" width="36" height="28" rx="3" fill="hsl(var(--card))" stroke="hsl(var(--card-border))" strokeWidth="1.5" />
      <rect x="20" y="14" width="36" height="28" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Lines on top paper */}
      <line x1="26" y1="22" x2="50" y2="22" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="27" x2="44" y2="27" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="32" x2="48" y2="32" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sparkle */}
      <circle cx="52" cy="14" r="3" fill="hsl(var(--primary) / 0.3)" />
      <path d="M52 8 L52 11 M52 17 L52 20 M46 14 L49 14 M55 14 L58 14" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EmptyIllustrationBook() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Open book */}
      <path d="M8 20 Q8 16 14 16 L32 18 L32 46 Q26 44 14 44 Q8 44 8 48 Z" fill="hsl(var(--card))" stroke="hsl(var(--card-border))" strokeWidth="1.5" />
      <path d="M56 20 Q56 16 50 16 L32 18 L32 46 Q38 44 50 44 Q56 44 56 48 Z" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Spine */}
      <line x1="32" y1="18" x2="32" y2="46" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Lines left page */}
      <line x1="13" y1="24" x2="27" y2="25" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="29" x2="26" y2="30" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="34" x2="25" y2="35" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="39" x2="24" y2="40" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      {/* Lines right page */}
      <line x1="37" y1="25" x2="51" y2="24" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="38" y1="30" x2="51" y2="29" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="39" y1="35" x2="51" y2="34" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="40" y1="40" x2="51" y2="39" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      {/* Bookmark ribbon */}
      <path d="M42 18 L42 26 Q42 28 44 28 L46 28 Q48 28 48 26 L48 18" fill="hsl(var(--accent) / 0.4)" stroke="hsl(var(--accent))" strokeWidth="1" />
    </svg>
  );
}

function EmptyIllustrationAttachment() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Document */}
      <path d="M12 12 L40 12 L52 24 L52 52 Q52 56 48 56 L16 56 Q12 56 12 52 Z" fill="hsl(var(--card))" stroke="hsl(var(--card-border))" strokeWidth="1.5" />
      {/* Folded corner */}
      <path d="M40 12 L40 24 L52 24" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Lines */}
      <line x1="18" y1="30" x2="46" y2="30" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="36" x2="40" y2="36" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="42" x2="44" y2="42" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
      {/* Paperclip */}
      <path d="M44 26 Q44 20 50 20 Q56 20 56 26 Q56 30 52 32 L52 44 Q52 48 48 48 Q44 48 44 44 L44 34 Q44 32 46 32 Q48 32 48 34 L48 42 Q48 44 46 44 Q44 44 44 42 Z" fill="none" stroke="hsl(var(--primary) / 0.5)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EmptyIllustrationChat() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left bubble (AI) */}
      <rect x="8" y="20" width="30" height="20" rx="6" fill="hsl(var(--secondary))" stroke="hsl(var(--secondary-border))" strokeWidth="1.5" />
      {/* Tail left */}
      <path d="M12 40 L8 44 L16 40" fill="hsl(var(--secondary))" stroke="hsl(var(--secondary-border))" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Dots in left bubble */}
      <circle cx="16" cy="30" r="2" fill="hsl(var(--muted-foreground) / 0.4)" />
      <circle cx="23" cy="30" r="2" fill="hsl(var(--muted-foreground) / 0.4)" />
      <circle cx="30" cy="30" r="2" fill="hsl(var(--muted-foreground) / 0.4)" />
      {/* Right bubble (User) */}
      <rect x="30" y="36" width="26" height="18" rx="6" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      {/* Tail right */}
      <path d="M52 54 L56 58 L48 54" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Lines in right bubble */}
      <line x1="36" y1="43" x2="50" y2="43" stroke="hsl(var(--primary-foreground) / 0.5)" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="48" x2="46" y2="48" stroke="hsl(var(--primary-foreground) / 0.5)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EmptyIllustrationQuiz() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Document */}
      <rect x="12" y="8" width="40" height="48" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--card-border))" strokeWidth="1.5" />
      {/* Header bar */}
      <rect x="12" y="8" width="40" height="12" rx="4" fill="hsl(var(--secondary))" stroke="hsl(var(--secondary-border))" strokeWidth="1.5" />
      <rect x="12" y="14" width="40" height="6" fill="hsl(var(--secondary))" />
      {/* Question mark in header */}
      <text x="32" y="18" textAnchor="middle" fill="hsl(var(--primary))" fontSize="10" fontWeight="bold" fontFamily="var(--app-font-sans)">?</text>
      {/* Question lines */}
      <line x1="18" y1="28" x2="46" y2="28" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="34" x2="42" y2="34" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
      {/* Checkbox options */}
      <rect x="18" y="40" width="8" height="8" rx="2" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <line x1="30" y1="44" x2="46" y2="44" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="18" y="50" width="8" height="8" rx="2" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <line x1="30" y1="54" x2="46" y2="54" stroke="hsl(var(--border))" strokeWidth="1.2" strokeLinecap="round" />
      {/* Pen/editing icon */}
      <path d="M44 16 L50 22 L48 24 L42 18 Z" fill="hsl(var(--accent) / 0.3)" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="41" cy="21" r="4" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
    </svg>
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
  EmptyIllustrationPapers,
  EmptyIllustrationBook,
  EmptyIllustrationAttachment,
  EmptyIllustrationChat,
  EmptyIllustrationQuiz,
};
